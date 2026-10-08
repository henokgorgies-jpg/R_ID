import { describe, expect, it } from "vitest";
import { validateFamilyGraphForCreate } from "../lib/family/relationship-validation";

describe("API relationship validation", () => {
  it("rejects same father and mother", async () => {
    const dbMock = {
      resident: {
        findUnique: async () => ({ id: "resident-1", householdId: "hh-1", householdRole: "head" }),
      },
    };
    const err = await validateFamilyGraphForCreate(dbMock as any, {
      fatherResidentId: "resident-1",
      motherResidentId: "resident-1",
      householdId: "hh-1",
    });
    expect(err).toContain("same resident");
  });
});

