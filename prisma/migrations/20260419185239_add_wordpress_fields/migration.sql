-- AlterTable
ALTER TABLE "Monitor" ADD COLUMN     "wpLatestVersion" TEXT,
ADD COLUMN     "wpPlugins" JSONB,
ADD COLUMN     "wpScannedAt" TIMESTAMP(3),
ADD COLUMN     "wpSecurityChecks" JSONB,
ADD COLUMN     "wpVersion" TEXT,
ADD COLUMN     "wpVersionStatus" TEXT;
