-- CreateEnum
CREATE TYPE "HouseholdStatus" AS ENUM ('active', 'inactive', 'relocated');

-- CreateEnum
CREATE TYPE "DuplicateStatus" AS ENUM ('pending_review', 'confirmed_duplicate', 'not_duplicate', 'merged', 'flagged');

-- CreateEnum
CREATE TYPE "DuplicatePriority" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "DuplicateDecision" AS ENUM ('merge', 'keep_both', 'flag_for_audit');

-- CreateEnum
CREATE TYPE "DetectionMethod" AS ENUM ('registration', 'batch_scan', 'manual_flag');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('draft', 'submitted', 'pending_destination', 'approved', 'rejected', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "TransferType" AS ENUM ('within_woreda', 'cross_woreda', 'cross_zone');

-- CreateEnum
CREATE TYPE "LifeEventType" AS ENUM ('birth', 'death', 'marriage', 'divorce', 'address_change', 'name_change', 'status_change');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('create', 'read', 'update', 'delete', 'login', 'logout', 'export', 'merge', 'transfer', 'generate_id', 'verify_id', 'approve', 'reject');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('resident', 'household', 'id_card', 'transfer', 'duplicate', 'life_event', 'user', 'system');

-- CreateTable
CREATE TABLE "Household" (
    "id" VARCHAR(64) NOT NULL,
    "kebeleId" VARCHAR(64) NOT NULL,
    "woredaId" VARCHAR(64) NOT NULL,
    "zoneId" VARCHAR(64) NOT NULL,
    "headResidentId" VARCHAR(64) NOT NULL,
    "address" JSONB NOT NULL,
    "contactPhone" VARCHAR(30),
    "memberCount" INTEGER NOT NULL,
    "status" "HouseholdStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuplicateCase" (
    "id" VARCHAR(64) NOT NULL,
    "resident1Id" VARCHAR(64) NOT NULL,
    "resident2Id" VARCHAR(64) NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "scores" JSONB NOT NULL,
    "status" "DuplicateStatus" NOT NULL,
    "priority" "DuplicatePriority" NOT NULL,
    "reviewedBy" VARCHAR(64),
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "decision" "DuplicateDecision",
    "mergedResidentId" VARCHAR(64),
    "mergedAt" TIMESTAMP(3),
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "detectionMethod" "DetectionMethod" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DuplicateCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transfer" (
    "id" VARCHAR(64) NOT NULL,
    "residentId" VARCHAR(64) NOT NULL,
    "sourceKebeleId" VARCHAR(64) NOT NULL,
    "sourceWoredaId" VARCHAR(64) NOT NULL,
    "sourceZoneId" VARCHAR(64) NOT NULL,
    "destinationKebeleId" VARCHAR(64) NOT NULL,
    "destinationWoredaId" VARCHAR(64) NOT NULL,
    "destinationZoneId" VARCHAR(64) NOT NULL,
    "transferType" "TransferType" NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "TransferStatus" NOT NULL,
    "initiatedBy" VARCHAR(64) NOT NULL,
    "initiatedAt" TIMESTAMP(3) NOT NULL,
    "sourceApprovedBy" VARCHAR(64),
    "sourceApprovedAt" TIMESTAMP(3),
    "destinationApprovedBy" VARCHAR(64),
    "destinationApprovedAt" TIMESTAMP(3),
    "completedBy" VARCHAR(64),
    "completedAt" TIMESTAMP(3),
    "rejectedBy" VARCHAR(64),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "requiresNewId" BOOLEAN NOT NULL DEFAULT false,
    "newIdNumber" VARCHAR(40),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LifeEvent" (
    "id" VARCHAR(64) NOT NULL,
    "residentId" VARCHAR(64) NOT NULL,
    "eventType" "LifeEventType" NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "data" JSONB NOT NULL,
    "documentRefs" TEXT[],
    "notes" TEXT,
    "relatedResidentIds" TEXT[],
    "registeredBy" VARCHAR(64) NOT NULL,
    "registeredAt" TIMESTAMP(3) NOT NULL,
    "verifiedBy" VARCHAR(64),
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LifeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" VARCHAR(64) NOT NULL,
    "userId" VARCHAR(64) NOT NULL,
    "userEmail" VARCHAR(190) NOT NULL,
    "userRole" "UserRole" NOT NULL,
    "action" "AuditAction" NOT NULL,
    "resourceType" "ResourceType" NOT NULL,
    "resourceId" VARCHAR(64),
    "previousValue" JSONB,
    "newValue" JSONB,
    "description" TEXT NOT NULL,
    "ipAddress" VARCHAR(64),
    "userAgent" TEXT,
    "kebeleId" VARCHAR(64),
    "woredaId" VARCHAR(64),
    "zoneId" VARCHAR(64),
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Household_zoneId_idx" ON "Household"("zoneId");

-- CreateIndex
CREATE INDEX "Household_woredaId_idx" ON "Household"("woredaId");

-- CreateIndex
CREATE INDEX "Household_kebeleId_idx" ON "Household"("kebeleId");

-- CreateIndex
CREATE INDEX "DuplicateCase_resident1Id_idx" ON "DuplicateCase"("resident1Id");

-- CreateIndex
CREATE INDEX "DuplicateCase_resident2Id_idx" ON "DuplicateCase"("resident2Id");

-- CreateIndex
CREATE INDEX "DuplicateCase_status_idx" ON "DuplicateCase"("status");

-- CreateIndex
CREATE INDEX "DuplicateCase_priority_idx" ON "DuplicateCase"("priority");

-- CreateIndex
CREATE INDEX "Transfer_residentId_idx" ON "Transfer"("residentId");

-- CreateIndex
CREATE INDEX "Transfer_status_idx" ON "Transfer"("status");

-- CreateIndex
CREATE INDEX "Transfer_sourceKebeleId_idx" ON "Transfer"("sourceKebeleId");

-- CreateIndex
CREATE INDEX "Transfer_destinationKebeleId_idx" ON "Transfer"("destinationKebeleId");

-- CreateIndex
CREATE INDEX "LifeEvent_residentId_idx" ON "LifeEvent"("residentId");

-- CreateIndex
CREATE INDEX "LifeEvent_eventType_idx" ON "LifeEvent"("eventType");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- AddForeignKey
ALTER TABLE "Resident" ADD CONSTRAINT "Resident_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Household" ADD CONSTRAINT "Household_kebeleId_fkey" FOREIGN KEY ("kebeleId") REFERENCES "Kebele"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Household" ADD CONSTRAINT "Household_woredaId_fkey" FOREIGN KEY ("woredaId") REFERENCES "Woreda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Household" ADD CONSTRAINT "Household_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuplicateCase" ADD CONSTRAINT "DuplicateCase_resident1Id_fkey" FOREIGN KEY ("resident1Id") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuplicateCase" ADD CONSTRAINT "DuplicateCase_resident2Id_fkey" FOREIGN KEY ("resident2Id") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuplicateCase" ADD CONSTRAINT "DuplicateCase_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_sourceKebeleId_fkey" FOREIGN KEY ("sourceKebeleId") REFERENCES "Kebele"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_sourceWoredaId_fkey" FOREIGN KEY ("sourceWoredaId") REFERENCES "Woreda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_sourceZoneId_fkey" FOREIGN KEY ("sourceZoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_destinationKebeleId_fkey" FOREIGN KEY ("destinationKebeleId") REFERENCES "Kebele"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_destinationWoredaId_fkey" FOREIGN KEY ("destinationWoredaId") REFERENCES "Woreda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_destinationZoneId_fkey" FOREIGN KEY ("destinationZoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_initiatedBy_fkey" FOREIGN KEY ("initiatedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_sourceApprovedBy_fkey" FOREIGN KEY ("sourceApprovedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_destinationApprovedBy_fkey" FOREIGN KEY ("destinationApprovedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_completedBy_fkey" FOREIGN KEY ("completedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_rejectedBy_fkey" FOREIGN KEY ("rejectedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LifeEvent" ADD CONSTRAINT "LifeEvent_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LifeEvent" ADD CONSTRAINT "LifeEvent_registeredBy_fkey" FOREIGN KEY ("registeredBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LifeEvent" ADD CONSTRAINT "LifeEvent_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_kebeleId_fkey" FOREIGN KEY ("kebeleId") REFERENCES "Kebele"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_woredaId_fkey" FOREIGN KEY ("woredaId") REFERENCES "Woreda"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
