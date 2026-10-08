import { describe, expect, it } from "vitest";
import { FACE_BLOCK_THRESHOLD, FACE_REVIEW_THRESHOLD, mapFaceDecision } from "../lib/face/matching";

describe("face thresholds", () => {
  it("keeps block threshold above review threshold", () => {
    expect(FACE_BLOCK_THRESHOLD).toBeGreaterThan(FACE_REVIEW_THRESHOLD);
  });

  it("switches decisions exactly at threshold edges", () => {
    expect(mapFaceDecision(FACE_BLOCK_THRESHOLD)).toBe("block");
    expect(mapFaceDecision(FACE_REVIEW_THRESHOLD)).toBe("review");
    expect(mapFaceDecision(FACE_REVIEW_THRESHOLD - 0.001)).toBe("clear");
  });
});
