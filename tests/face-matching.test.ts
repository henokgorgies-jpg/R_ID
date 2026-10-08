import { describe, expect, it } from "vitest";
import { mapFaceDecision, normalizeFaceSimilarity, similarityToPercent } from "../lib/face/matching";

describe("face matching helpers", () => {
  it("normalizes both 0-1 and 0-100 inputs", () => {
    expect(normalizeFaceSimilarity(0.87)).toBeCloseTo(0.87, 5);
    expect(normalizeFaceSimilarity(87)).toBeCloseTo(0.87, 5);
    expect(similarityToPercent(0.873)).toBe(87.3);
  });

  it("maps decisions by threshold", () => {
    expect(mapFaceDecision(0.95)).toBe("block");
    expect(mapFaceDecision(0.85)).toBe("review");
    expect(mapFaceDecision(0.6)).toBe("clear");
  });
});
