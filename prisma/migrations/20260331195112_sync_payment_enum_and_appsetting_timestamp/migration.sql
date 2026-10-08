-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'payment';

-- AlterTable
ALTER TABLE IF EXISTS "AppSetting"
ALTER COLUMN "updatedAt" DROP DEFAULT;
