export type RegisterStep = "personal" | "contact" | "administrative" | "household";

export type RegisterFormSnapshot = {
  firstName: string;
  fatherName: string;
  grandFatherName: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  city: string;
  phoneNumber: string;
  zoneId: string;
  woredaId: string;
  kebeleId: string;
  householdRole: string;
  linkedHeadResidentId: string;
  spouseFirstName?: string;
  spouseFatherName?: string;
  spouseGrandFatherName?: string;
  spouseResidentId?: string;
};

export function isStepComplete(step: RegisterStep, form: RegisterFormSnapshot): boolean {
  if (step === "personal") {
    return !!(
      form.firstName.trim() &&
      form.fatherName.trim() &&
      form.grandFatherName.trim() &&
      form.dateOfBirth &&
      form.gender &&
      form.maritalStatus
    );
  }
  if (step === "contact") {
    return !!(form.city.trim() && form.phoneNumber.trim());
  }
  if (step === "administrative") {
    return !!(form.zoneId && form.woredaId && form.kebeleId);
  }
  if (step === "household") {
    if (!form.householdRole) return false;
    if (form.householdRole !== "head" && !form.linkedHeadResidentId) return false;
    if (form.householdRole === "head" && form.maritalStatus !== "single") {
      const hasStructuredSpouseName =
        !!form.spouseFirstName?.trim() &&
        !!form.spouseFatherName?.trim() &&
        !!form.spouseGrandFatherName?.trim();
      if (!hasStructuredSpouseName && !form.spouseResidentId) return false;
    }
    return true;
  }
  return true;
}
