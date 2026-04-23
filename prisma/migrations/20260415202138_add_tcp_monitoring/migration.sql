-- AlterEnum
ALTER TYPE "MonitorType" ADD VALUE 'TCP';

-- AlterTable
ALTER TABLE "Monitor" ADD COLUMN     "port" INTEGER;
