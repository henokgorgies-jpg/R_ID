import { db } from "@/lib/db";
import { extractEmbedding, searchSimilar } from "@/lib/face/client";
import { mapFaceDecision, normalizeFaceSimilarity } from "@/lib/face/matching";

interface FaceJobScope {
  zoneId?: string;
  woredaId?: string;
  kebeleId?: string;
}

interface FaceJobActor {
  id: string;
  email: string;
  role: "super_admin" | "zone_admin" | "woreda_admin" | "kebele_admin" | "auditor" | "verification_officer";
}

interface FaceEmbeddingJobInput {
  residentId: string;
  photoUrl: string;
  scope?: FaceJobScope;
  actor: FaceJobActor;
}

interface SimilarResident {
  residentId: string;
  similarity: number;
}

export interface FaceEmbeddingJobResult {
  faceStatus: "pending" | "ready" | "failed";
  error?: string;
  bestMatch?: {
    residentId: string;
    similarity: number;
    decision: "block" | "review" | "clear";
  };
}

const FACE_TOP_K = Number(process.env.FACE_TOP_K ?? 5);
const FACE_MODEL_VERSION = process.env.FACE_MODEL_VERSION ?? "buffalo_l_v1";
const FACE_INSIGHT_MIN_THRESHOLD = Number(process.env.FACE_INSIGHT_MIN_THRESHOLD ?? 0.55);

function nowId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function escapeSqlLiteral(input: string): string {
  return input.replace(/'/g, "''");
}

function toVectorLiteral(embedding: number[]): string {
  if (embedding.length !== 512) {
    throw new Error(`Expected 512 dimensions, got ${embedding.length}`);
  }
  const vector = embedding.map((value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) {
      throw new Error("Embedding contains non-finite values");
    }
    return num.toFixed(8);
  });
  return `[${vector.join(",")}]`;
}

async function upsertEmbeddingRow(params: {
  residentId: string;
  embedding: number[];
  qualityScore: number | null;
  faceCount: number;
  modelVersion: string;
}): Promise<void> {
  const vectorLiteral = toVectorLiteral(params.embedding);
  const rowId = `face-${params.residentId}`;
  const qualityValue = params.qualityScore == null ? "NULL" : Number(params.qualityScore).toString();

  await db.$executeRawUnsafe(
    `
      INSERT INTO "ResidentFaceEmbedding" ("id", "residentId", "embedding", "qualityScore", "faceCount", "modelVersion", "createdAt", "updatedAt")
      VALUES ('${escapeSqlLiteral(rowId)}', '${escapeSqlLiteral(params.residentId)}', '${vectorLiteral}'::vector, ${qualityValue}, ${params.faceCount}, '${escapeSqlLiteral(params.modelVersion)}', NOW(), NOW())
      ON CONFLICT ("residentId")
      DO UPDATE SET
        "embedding" = EXCLUDED."embedding",
        "qualityScore" = EXCLUDED."qualityScore",
        "faceCount" = EXCLUDED."faceCount",
        "modelVersion" = EXCLUDED."modelVersion",
        "updatedAt" = NOW()
    `,
  );
}

async function fallbackSearchSimilar(embedding: number[], residentId: string, scope?: FaceJobScope): Promise<SimilarResident[]> {
  const vectorLiteral = toVectorLiteral(embedding);

  const filters: string[] = ["r.\"id\" <> $1"];
  const params: Array<string | number> = [residentId];

  if (scope?.zoneId) {
    params.push(scope.zoneId);
    filters.push(`r."zoneId" = $${params.length}`);
  }
  if (scope?.woredaId) {
    params.push(scope.woredaId);
    filters.push(`r."woredaId" = $${params.length}`);
  }
  if (scope?.kebeleId) {
    params.push(scope.kebeleId);
    filters.push(`r."kebeleId" = $${params.length}`);
  }

  params.push(FACE_TOP_K);

  const rows = await db.$queryRawUnsafe<Array<{ residentId: string; similarity: number }>>(
    `
      SELECT r."id" AS "residentId",
        (1 - (e."embedding" <=> '${vectorLiteral}'::vector)) AS "similarity"
      FROM "ResidentFaceEmbedding" e
      JOIN "Resident" r ON r."id" = e."residentId"
      WHERE ${filters.join(" AND ")}
      ORDER BY e."embedding" <=> '${vectorLiteral}'::vector ASC
      LIMIT $${params.length}
    `,
    ...params,
  );

  return rows
    .map((row) => ({ residentId: row.residentId, similarity: normalizeFaceSimilarity(row.similarity) }))
    .sort((a, b) => b.similarity - a.similarity);
}

async function resolveSimilarResidents(embedding: number[], residentId: string, scope?: FaceJobScope): Promise<SimilarResident[]> {
  try {
    const apiResult = await searchSimilar({ embedding, topK: FACE_TOP_K, residentId, scope });
    if (apiResult.ok && Array.isArray(apiResult.matches) && apiResult.matches.length > 0) {
      return apiResult.matches
        .filter((match) => match.residentId !== residentId)
        .map((match) => ({
          residentId: match.residentId,
          similarity: normalizeFaceSimilarity(match.similarity),
        }))
        .sort((a, b) => b.similarity - a.similarity);
    }
  } catch {
    // Fall back to pgvector similarity search in the main database.
  }

  return fallbackSearchSimilar(embedding, residentId, scope);
}

function getCasePriority(similarity: number): "low" | "medium" | "high" | "critical" {
  const decision = mapFaceDecision(similarity);
  if (decision === "block") return "critical";
  if (decision === "review") return "high";
  return "medium";
}

async function upsertDuplicateCaseByFace(params: {
  residentId: string;
  similarResidentId: string;
  similarity: number;
  actor: FaceJobActor;
}): Promise<void> {
  const [resident1Id, resident2Id] = [params.residentId, params.similarResidentId].sort();
  const existing = await db.duplicateCase.findFirst({
    where: {
      OR: [
        { resident1Id, resident2Id },
        { resident1Id: resident2Id, resident2Id: resident1Id },
      ],
    },
    select: { id: true },
  });

  const faceScore = Math.round(normalizeFaceSimilarity(params.similarity) * 1000) / 10;
  const decision = mapFaceDecision(params.similarity);
  const scorePayload = {
    nameScore: 0,
    phoneticScore: 0,
    dobScore: 0,
    phoneScore: 0,
    addressScore: 0,
    genderScore: 0,
    householdScore: 0,
    faceScore,
    totalScore: faceScore,
  };

  if (existing) {
    await db.duplicateCase.update({
      where: { id: existing.id },
      data: {
        overallScore: Math.round(faceScore),
        scores: scorePayload,
        status: decision === "clear" ? "pending_review" : "flagged",
        priority: getCasePriority(params.similarity),
        detectedAt: new Date(),
        detectionMethod: "registration",
      },
    });
    return;
  }

  await db.duplicateCase.create({
    data: {
      id: nowId("dup-face"),
      resident1Id,
      resident2Id,
      overallScore: Math.round(faceScore),
      scores: scorePayload,
      status: decision === "clear" ? "pending_review" : "flagged",
      priority: getCasePriority(params.similarity),
      detectedAt: new Date(),
      detectionMethod: "registration",
    },
  });

  await db.auditLog.create({
    data: {
      id: nowId("audit"),
      userId: params.actor.id,
      userEmail: params.actor.email,
      userRole: params.actor.role,
      action: "create",
      resourceType: "duplicate",
      resourceId: `${resident1Id}:${resident2Id}`,
      description: "Duplicate case flagged by face match",
      newValue: {
        resident1Id,
        resident2Id,
        faceSimilarity: faceScore,
      },
      timestamp: new Date(),
    },
  });
}

export async function runFaceEmbeddingJob(input: FaceEmbeddingJobInput): Promise<FaceEmbeddingJobResult> {
  try {
    const extracted = await extractEmbedding({
      imageBase64: input.photoUrl.startsWith("data:") ? input.photoUrl : undefined,
      imageUrl: input.photoUrl.startsWith("http") ? input.photoUrl : undefined,
    });

    if (!extracted.ok || !extracted.embedding) {
      await db.resident.update({
        where: { id: input.residentId },
        data: {
          faceStatus: "failed",
          faceError: extracted.error ?? "Embedding extraction failed",
          faceUpdatedAt: new Date(),
        },
      });
      return {
        faceStatus: "failed",
        error: extracted.error ?? "Embedding extraction failed",
      };
    }

    if (extracted.faceCount !== 1) {
      await db.resident.update({
        where: { id: input.residentId },
        data: {
          faceStatus: "failed",
          faceError: `Expected exactly 1 face, got ${extracted.faceCount}`,
          faceUpdatedAt: new Date(),
        },
      });
      return {
        faceStatus: "failed",
        error: `Expected exactly 1 face, got ${extracted.faceCount}`,
      };
    }

    await upsertEmbeddingRow({
      residentId: input.residentId,
      embedding: extracted.embedding,
      qualityScore: extracted.quality ?? null,
      faceCount: extracted.faceCount,
      modelVersion: extracted.modelVersion ?? FACE_MODEL_VERSION,
    });

    await db.resident.update({
      where: { id: input.residentId },
      data: {
        faceStatus: "ready",
        faceError: null,
        faceUpdatedAt: new Date(),
      },
    });

    await db.auditLog.create({
      data: {
        id: nowId("audit"),
        userId: input.actor.id,
        userEmail: input.actor.email,
        userRole: input.actor.role,
        action: "create",
        resourceType: "resident",
        resourceId: input.residentId,
        description: "Face embedding generated",
        newValue: {
          faceStatus: "ready",
          qualityScore: extracted.quality ?? null,
          faceCount: extracted.faceCount,
          modelVersion: extracted.modelVersion ?? FACE_MODEL_VERSION,
        },
        zoneId: input.scope?.zoneId ?? null,
        woredaId: input.scope?.woredaId ?? null,
        kebeleId: input.scope?.kebeleId ?? null,
        timestamp: new Date(),
      },
    });

    const matches = await resolveSimilarResidents(extracted.embedding, input.residentId, input.scope);
    const best = matches.find((item) => item.similarity >= FACE_INSIGHT_MIN_THRESHOLD);

    if (best) {
      const decision = mapFaceDecision(best.similarity);
      await upsertDuplicateCaseByFace({
        residentId: input.residentId,
        similarResidentId: best.residentId,
        similarity: best.similarity,
        actor: input.actor,
      });
      return {
        faceStatus: "ready",
        bestMatch: {
          residentId: best.residentId,
          similarity: best.similarity,
          decision,
        },
      };
    }
    return { faceStatus: "ready" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown face pipeline error";
    await db.resident.update({
      where: { id: input.residentId },
      data: {
        faceStatus: "failed",
        faceError: message,
        faceUpdatedAt: new Date(),
      },
    });
    return { faceStatus: "failed", error: message };
  }
}
