-- AlterTable
ALTER TABLE "Monitor" ADD COLUMN     "wpGaTrackingId" TEXT,
ADD COLUMN     "wpGtmContainerId" TEXT,
ADD COLUMN     "wpInMaintenanceMode" BOOLEAN,
ADD COLUMN     "wpThemes" JSONB;
