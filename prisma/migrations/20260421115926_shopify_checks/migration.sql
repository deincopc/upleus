-- AlterTable
ALTER TABLE "Monitor" ADD COLUMN     "shopifyChecks" JSONB,
ADD COLUMN     "shopifyScannedAt" TIMESTAMP(3);
