import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, residentScopeWhere } from "@/lib/auth/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const FACE_INSIGHT_MIN_THRESHOLD = Number(process.env.FACE_INSIGHT_MIN_THRESHOLD ?? 0.55);

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "residents:read");
  if (auth instanceof NextResponse) return auth;
  if (auth.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const scopeWhere = residentScopeWhere(auth.user);
    const pending = await db.resident.findMany({
      where: { ...scopeWhere, status: "inactive", idStatus: "pending" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        firstName: true,
        fatherName: true,
        grandFatherName: true,
        zoneId: true,
        woredaId: true,
        kebeleId: true,
        registrationDate: true,
        createdAt: true,
        maritalStatus: true,
        householdRole: true,
        registeredByUser: { select: { firstName: true, lastName: true, email: true } },
        kebele: { select: { name: true } },
      },
    });

    const ids = pending.map((r) => r.id);
    const duplicateCases = ids.length
      ? await db.duplicateCase.findMany({
          where: {
            OR: [
              { resident1Id: { in: ids } },
              { resident2Id: { in: ids } },
            ],
          },
          orderBy: { overallScore: "desc" },
          select: {
            id: true,
            resident1Id: true,
            resident2Id: true,
            overallScore: true,
            scores: true,
            status: true,
            detectedAt: true,
            mergedResidentId: true,
            resident1: {
              select: {
                firstName: true,
                fatherName: true,
                woreda: { select: { name: true } },
                kebele: { select: { name: true } },
              },
            },
            resident2: {
              select: {
                firstName: true,
                fatherName: true,
                woreda: { select: { name: true } },
                kebele: { select: { name: true } },
              },
            },
          },
        })
      : [];

    const bestByResident = new Map<string, any>();
    for (const c of duplicateCases) {
      const pair = [
        { residentId: c.resident1Id, peerId: c.resident2Id, peer: c.resident2 },
        { residentId: c.resident2Id, peerId: c.resident1Id, peer: c.resident1 },
      ];
      for (const item of pair) {
        if (!ids.includes(item.residentId)) continue;
        if (!bestByResident.has(item.residentId)) {
          bestByResident.set(item.residentId, {
            duplicateCaseId: c.id,
            peerResidentId: item.peerId,
            peerName: `${item.peer.firstName} ${item.peer.fatherName}`.trim(),
            peerWoredaName: item.peer.woreda.name,
            peerKebeleName: item.peer.kebele.name,
            score: c.overallScore,
            faceScore: (c.scores as any)?.faceScore ?? null,
            status: c.status,
            mergedResidentId: c.mergedResidentId,
            detectedAt: c.detectedAt.toISOString(),
          });
        }
      }
    }

    const unresolved = pending.filter((r) => !bestByResident.has(r.id));
    for (const resident of unresolved) {
      const match = await db.$queryRaw<
        Array<{
          peerResidentId: string;
          peerFirstName: string;
          peerFatherName: string;
          peerWoredaName: string;
          peerKebeleName: string;
          similarity: number;
        }>
      >`
        SELECT
          r2.id AS "peerResidentId",
          r2."firstName" AS "peerFirstName",
          r2."fatherName" AS "peerFatherName",
          w2.name AS "peerWoredaName",
          k2.name AS "peerKebeleName",
          (1 - (e2."embedding" <=> e1."embedding")) AS "similarity"
        FROM "ResidentFaceEmbedding" e1
        JOIN "ResidentFaceEmbedding" e2
          ON e2."residentId" <> e1."residentId"
        JOIN "Resident" r2
          ON r2.id = e2."residentId"
        JOIN "Woreda" w2
          ON w2.id = r2."woredaId"
        JOIN "Kebele" k2
          ON k2.id = r2."kebeleId"
        WHERE e1."residentId" = ${resident.id}
        ORDER BY e2."embedding" <=> e1."embedding" ASC
        LIMIT 1
      `;

      const best = match[0];
      if (!best) continue;
      const normalized = Number(best.similarity);
      if (!Number.isFinite(normalized) || normalized < FACE_INSIGHT_MIN_THRESHOLD) continue;
      const faceScore = Math.round(Math.max(0, Math.min(normalized, 1)) * 1000) / 10;
      bestByResident.set(resident.id, {
        duplicateCaseId: `face-${resident.id}-${best.peerResidentId}`,
        peerResidentId: best.peerResidentId,
        peerName: `${best.peerFirstName} ${best.peerFatherName}`.trim(),
        peerWoredaName: best.peerWoredaName,
        peerKebeleName: best.peerKebeleName,
        score: Math.round(faceScore),
        faceScore,
        status: "pending_review",
        mergedResidentId: null,
        detectedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      residents: pending.map((r, index) => ({
        ...r,
        registrationDate: r.registrationDate.toISOString(),
        createdAt: r.createdAt.toISOString(),
        registeredByName: `${r.registeredByUser.firstName} ${r.registeredByUser.lastName}`.trim(),
        registeredByEmail: r.registeredByUser.email,
        kebeleName: r.kebele.name,
        queueRank: index + 1,
        duplicateHint: bestByResident.get(r.id) ?? null,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch pending residents:", error);
    return NextResponse.json({ error: "Failed to fetch pending residents" }, { status: 500 });
  }
}
