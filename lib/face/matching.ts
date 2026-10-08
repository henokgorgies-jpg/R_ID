export const FACE_BLOCK_THRESHOLD = Number(process.env.FACE_BLOCK_THRESHOLD ?? 0.92);
export const FACE_REVIEW_THRESHOLD = Number(process.env.FACE_REVIEW_THRESHOLD ?? 0.82);

export type FaceDecision = "block" | "review" | "clear";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeFaceSimilarity(value: number): number {
  if (!Number.isFinite(value)) return 0;
  // Allow callers to pass 0-1 or 0-100.
  if (value > 1) return clamp(value / 100, 0, 1);
  return clamp(value, 0, 1);
}

export function similarityToPercent(similarity: number): number {
  return Math.round(normalizeFaceSimilarity(similarity) * 1000) / 10;
}

export function mapFaceDecision(similarity: number): FaceDecision {
  const normalized = normalizeFaceSimilarity(similarity);
  if (normalized >= FACE_BLOCK_THRESHOLD) return "block";
  if (normalized >= FACE_REVIEW_THRESHOLD) return "review";
  return "clear";
}
