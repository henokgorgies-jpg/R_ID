-- Enable pgvector extension for face embedding storage and ANN search.
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "FaceStatus" AS ENUM ('pending', 'ready', 'failed');

-- AlterTable
ALTER TABLE "Resident"
ADD COLUMN "faceError" TEXT,
ADD COLUMN "faceStatus" "FaceStatus" NOT NULL DEFAULT 'pending',
ADD COLUMN "faceUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ResidentFaceEmbedding" (
  "id" VARCHAR(64) NOT NULL,
  "residentId" VARCHAR(64) NOT NULL,
  "embedding" vector(512) NOT NULL,
  "qualityScore" DOUBLE PRECISION,
  "faceCount" INTEGER NOT NULL DEFAULT 0,
  "modelVersion" VARCHAR(64) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ResidentFaceEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResidentFaceEmbedding_residentId_key" ON "ResidentFaceEmbedding"("residentId");

-- CreateIndex
CREATE INDEX "ResidentFaceEmbedding_residentId_idx" ON "ResidentFaceEmbedding"("residentId");

-- CreateIndex
CREATE INDEX "ResidentFaceEmbedding_embedding_idx"
ON "ResidentFaceEmbedding"
USING ivfflat ("embedding" vector_cosine_ops)
WITH (lists = 100);

-- AddForeignKey
ALTER TABLE "ResidentFaceEmbedding"
ADD CONSTRAINT "ResidentFaceEmbedding_residentId_fkey"
FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
