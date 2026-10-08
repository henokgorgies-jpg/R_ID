import { describe, expect, it } from "vitest";
import { isStepComplete } from "../lib/forms/register-step-validation";

const base = {
  firstName: "A",
  fatherName: "B",
  grandFatherName: "C",
  dateOfBirth: "2000-01-01",
  gender: "male",
  maritalStatus: "single",
  city: "Addis Ababa",
  phoneNumber: "0911000000",
  zoneId: "zone-01",
  woredaId: "woreda-01",
  kebeleId: "kebele-01",
  householdRole: "head",
  linkedHeadResidentId: "",
};

describe("UI step validation", () => {
  it("blocks incomplete personal step", () => {
    expect(isStepComplete("personal", base)).toBe(true);
    expect(isStepComplete("personal", { ...base, firstName: "" })).toBe(false);
  });

  it("requires family head for child/spouse/relative", () => {
    expect(isStepComplete("household", { ...base, householdRole: "child", linkedHeadResidentId: "" })).toBe(false);
    expect(isStepComplete("household", { ...base, householdRole: "child", linkedHeadResidentId: "resident-1" })).toBe(true);
  });
});

