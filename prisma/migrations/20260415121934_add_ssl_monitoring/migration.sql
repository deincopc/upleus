-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AlertType" ADD VALUE 'SSL_EXPIRY_30';
ALTER TYPE "AlertType" ADD VALUE 'SSL_EXPIRY_7';
ALTER TYPE "AlertType" ADD VALUE 'SSL_EXPIRY_1';
ALTER TYPE "AlertType" ADD VALUE 'SSL_INVALID';

-- AlterTable
ALTER TABLE "Monitor" ADD COLUMN     "sslDaysUntilExpiry" INTEGER,
ADD COLUMN     "sslEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sslExpiresAt" TIMESTAMP(3),
ADD COLUMN     "sslValid" BOOLEAN;
