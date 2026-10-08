ALTER TABLE "Resident"
  ADD COLUMN "motherName" VARCHAR(120),
  ADD COLUMN "fatherResidentId" VARCHAR(64),
  ADD COLUMN "motherResidentId" VARCHAR(64);

CREATE INDEX "Resident_fatherResidentId_idx" ON "Resident"("fatherResidentId");
CREATE INDEX "Resident_motherResidentId_idx" ON "Resident"("motherResidentId");
