-- AlterTable
ALTER TABLE "Monitor" ADD COLUMN     "httpSecurityCheckedAt" TIMESTAMP(3),
ADD COLUMN     "httpSecurityChecks" JSONB,
ADD COLUMN     "keywordExpected" TEXT,
ADD COLUMN     "keywordFound" BOOLEAN;
