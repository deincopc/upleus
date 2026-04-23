-- CreateEnum
CREATE TYPE "MonitorType" AS ENUM ('HTTP', 'DOMAIN');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AlertType" ADD VALUE 'DOMAIN_EXPIRY_30';
ALTER TYPE "AlertType" ADD VALUE 'DOMAIN_EXPIRY_14';
ALTER TYPE "AlertType" ADD VALUE 'DOMAIN_EXPIRY_7';
ALTER TYPE "AlertType" ADD VALUE 'DOMAIN_EXPIRY_1';

-- AlterTable
ALTER TABLE "Monitor" ADD COLUMN     "domainDaysUntilExpiry" INTEGER,
ADD COLUMN     "domainExpiresAt" TIMESTAMP(3),
ADD COLUMN     "type" "MonitorType" NOT NULL DEFAULT 'HTTP';
