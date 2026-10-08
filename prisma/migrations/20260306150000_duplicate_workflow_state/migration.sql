-- Duplicate case workflow persistence: assignment, escalation, per-user snooze.
ALTER TABLE "DuplicateCase"
  ADD COLUMN IF NOT EXISTS "assignedTo" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "assignedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "escalated" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "escalatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "escalatedBy" VARCHAR(64);

CREATE TABLE IF NOT EXISTS "DuplicateCaseUserState" (
  "id" VARCHAR(64) NOT NULL,
  "duplicateCaseId" VARCHAR(64) NOT NULL,
  "userId" VARCHAR(64) NOT NULL,
  "snoozedUntil" TIMESTAMP(3),
  "snoozedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DuplicateCaseUserState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DuplicateCaseUserState_duplicateCaseId_userId_key"
  ON "DuplicateCaseUserState"("duplicateCaseId", "userId");

CREATE INDEX IF NOT EXISTS "DuplicateCaseUserState_userId_idx"
  ON "DuplicateCaseUserState"("userId");

CREATE INDEX IF NOT EXISTS "DuplicateCaseUserState_snoozedUntil_idx"
  ON "DuplicateCaseUserState"("snoozedUntil");

CREATE INDEX IF NOT EXISTS "DuplicateCase_assignedTo_idx"
  ON "DuplicateCase"("assignedTo");

CREATE INDEX IF NOT EXISTS "DuplicateCase_escalated_idx"
  ON "DuplicateCase"("escalated");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DuplicateCase_assignedTo_fkey'
  ) THEN
    ALTER TABLE "DuplicateCase"
      ADD CONSTRAINT "DuplicateCase_assignedTo_fkey"
      FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DuplicateCase_escalatedBy_fkey'
  ) THEN
    ALTER TABLE "DuplicateCase"
      ADD CONSTRAINT "DuplicateCase_escalatedBy_fkey"
      FOREIGN KEY ("escalatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DuplicateCaseUserState_duplicateCaseId_fkey'
  ) THEN
    ALTER TABLE "DuplicateCaseUserState"
      ADD CONSTRAINT "DuplicateCaseUserState_duplicateCaseId_fkey"
      FOREIGN KEY ("duplicateCaseId") REFERENCES "DuplicateCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DuplicateCaseUserState_userId_fkey'
  ) THEN
    ALTER TABLE "DuplicateCaseUserState"
      ADD CONSTRAINT "DuplicateCaseUserState_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
