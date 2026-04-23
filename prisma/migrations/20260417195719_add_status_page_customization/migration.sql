-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "statusBannerMessage" TEXT,
ADD COLUMN     "statusBrandColor" TEXT,
ADD COLUMN     "statusDescription" TEXT,
ADD COLUMN     "statusHideBranding" BOOLEAN NOT NULL DEFAULT false;
