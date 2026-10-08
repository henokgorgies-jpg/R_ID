-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('super_admin', 'zone_admin', 'woreda_admin', 'kebele_admin', 'auditor', 'verification_officer');

-- CreateEnum
CREATE TYPE "ScopeType" AS ENUM ('city', 'zone', 'woreda', 'kebele');

-- CreateEnum
CREATE TYPE "ResidentStatus" AS ENUM ('active', 'inactive', 'deceased', 'transferred_out', 'suspended');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('single', 'married', 'divorced', 'widowed', 'separated');

-- CreateEnum
CREATE TYPE "IdStatus" AS ENUM ('pending', 'active', 'expired', 'revoked', 'reissued');

-- CreateEnum
CREATE TYPE "HouseholdRole" AS ENUM ('head', 'spouse', 'child', 'relative', 'other');

-- CreateTable
CREATE TABLE "Zone" (
    "id" VARCHAR(64) NOT NULL,
    "code" VARCHAR(8) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "population" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Woreda" (
    "id" VARCHAR(64) NOT NULL,
    "zoneId" VARCHAR(64) NOT NULL,
    "code" VARCHAR(8) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "population" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Woreda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kebele" (
    "id" VARCHAR(64) NOT NULL,
    "woredaId" VARCHAR(64) NOT NULL,
    "zoneId" VARCHAR(64) NOT NULL,
    "code" VARCHAR(8) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "population" INTEGER NOT NULL,
    "householdCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kebele_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" VARCHAR(64) NOT NULL,
    "email" VARCHAR(190) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "firstName" VARCHAR(120) NOT NULL,
    "lastName" VARCHAR(120) NOT NULL,
    "role" "UserRole" NOT NULL,
    "scopeType" "ScopeType" NOT NULL,
    "scopeZoneId" VARCHAR(64),
    "scopeWoredaId" VARCHAR(64),
    "scopeKebeleId" VARCHAR(64),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resident" (
    "id" VARCHAR(64) NOT NULL,
    "kebeleId" VARCHAR(64) NOT NULL,
    "woredaId" VARCHAR(64) NOT NULL,
    "zoneId" VARCHAR(64) NOT NULL,
    "firstName" VARCHAR(120) NOT NULL,
    "fatherName" VARCHAR(120) NOT NULL,
    "grandFatherName" VARCHAR(120) NOT NULL,
    "firstNameAm" VARCHAR(120),
    "fatherNameAm" VARCHAR(120),
    "grandFatherNameAm" VARCHAR(120),
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "nationality" VARCHAR(80) NOT NULL,
    "ethnicity" VARCHAR(80),
    "religion" VARCHAR(80),
    "maritalStatus" "MaritalStatus" NOT NULL,
    "occupation" VARCHAR(120),
    "phoneNumber" VARCHAR(30),
    "alternatePhone" VARCHAR(30),
    "email" VARCHAR(190),
    "address" JSONB NOT NULL,
    "photoUrl" TEXT,
    "householdId" VARCHAR(64),
    "householdRole" "HouseholdRole",
    "idNumber" VARCHAR(40),
    "idIssuedDate" TIMESTAMP(3),
    "idExpiryDate" TIMESTAMP(3),
    "idStatus" "IdStatus",
    "status" "ResidentStatus" NOT NULL,
    "registrationDate" TIMESTAMP(3) NOT NULL,
    "registeredBy" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Resident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Zone_code_key" ON "Zone"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Zone_name_key" ON "Zone"("name");

-- CreateIndex
CREATE INDEX "Woreda_zoneId_idx" ON "Woreda"("zoneId");

-- CreateIndex
CREATE UNIQUE INDEX "Woreda_zoneId_code_key" ON "Woreda"("zoneId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Woreda_zoneId_name_key" ON "Woreda"("zoneId", "name");

-- CreateIndex
CREATE INDEX "Kebele_zoneId_idx" ON "Kebele"("zoneId");

-- CreateIndex
CREATE INDEX "Kebele_woredaId_idx" ON "Kebele"("woredaId");

-- CreateIndex
CREATE UNIQUE INDEX "Kebele_woredaId_code_key" ON "Kebele"("woredaId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Kebele_woredaId_name_key" ON "Kebele"("woredaId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_scopeType_idx" ON "User"("scopeType");

-- CreateIndex
CREATE INDEX "User_scopeZoneId_idx" ON "User"("scopeZoneId");

-- CreateIndex
CREATE INDEX "User_scopeWoredaId_idx" ON "User"("scopeWoredaId");

-- CreateIndex
CREATE INDEX "User_scopeKebeleId_idx" ON "User"("scopeKebeleId");

-- CreateIndex
CREATE UNIQUE INDEX "Resident_idNumber_key" ON "Resident"("idNumber");

-- CreateIndex
CREATE INDEX "Resident_zoneId_idx" ON "Resident"("zoneId");

-- CreateIndex
CREATE INDEX "Resident_woredaId_idx" ON "Resident"("woredaId");

-- CreateIndex
CREATE INDEX "Resident_kebeleId_idx" ON "Resident"("kebeleId");

-- CreateIndex
CREATE INDEX "Resident_registeredBy_idx" ON "Resident"("registeredBy");

-- CreateIndex
CREATE INDEX "Resident_status_idx" ON "Resident"("status");

-- CreateIndex
CREATE INDEX "Resident_firstName_fatherName_grandFatherName_idx" ON "Resident"("firstName", "fatherName", "grandFatherName");

-- AddForeignKey
ALTER TABLE "Woreda" ADD CONSTRAINT "Woreda_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kebele" ADD CONSTRAINT "Kebele_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kebele" ADD CONSTRAINT "Kebele_woredaId_fkey" FOREIGN KEY ("woredaId") REFERENCES "Woreda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_scopeZoneId_fkey" FOREIGN KEY ("scopeZoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_scopeWoredaId_fkey" FOREIGN KEY ("scopeWoredaId") REFERENCES "Woreda"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_scopeKebeleId_fkey" FOREIGN KEY ("scopeKebeleId") REFERENCES "Kebele"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resident" ADD CONSTRAINT "Resident_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resident" ADD CONSTRAINT "Resident_woredaId_fkey" FOREIGN KEY ("woredaId") REFERENCES "Woreda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resident" ADD CONSTRAINT "Resident_kebeleId_fkey" FOREIGN KEY ("kebeleId") REFERENCES "Kebele"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resident" ADD CONSTRAINT "Resident_registeredBy_fkey" FOREIGN KEY ("registeredBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
