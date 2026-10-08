import { describe, expect, it } from "vitest";
import { calculateDuplicateScore } from "../lib/duplicate-detection/scoring";

const baseResident = {
  id: "resident-1",
  firstName: "Abebe",
  fatherName: "Kebede",
  grandFatherName: "Tadesse",
  dateOfBirth: "1990-01-01",
  gender: "male",
  phoneNumber: "+251911111111",
  address: {
    city: "Addis Ababa",
    subcity: "Bole",
    streetName: "Street 10",
    houseNumber: "12A",
  },
  householdId: "hh-1",
} as any;

describe("resident face pipeline scoring", () => {
  it("adds face score weight into total score", () => {
    const withoutFace = calculateDuplicateScore(baseResident, { ...baseResident, id: "resident-2" });
    const withFace = calculateDuplicateScore(baseResident, { ...baseResident, id: "resident-3" }, { faceSimilarity: 0.9 });

    expect(withFace.faceScore).toBeGreaterThan(0);
    expect(withFace.totalScore).toBeGreaterThan(withoutFace.totalScore);
  });

  it("accepts percent face similarity input", () => {
    const score = calculateDuplicateScore(baseResident, { ...baseResident, id: "resident-4" }, { faceSimilarity: 90 });
    expect(score.faceScore).toBe(18);
  });
});
