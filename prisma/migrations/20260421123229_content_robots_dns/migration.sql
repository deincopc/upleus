-- AlterTable
ALTER TABLE "Monitor" ADD COLUMN     "contentChangedAt" TIMESTAMP(3),
ADD COLUMN     "contentHash" TEXT,
ADD COLUMN     "dnsChangedAt" TIMESTAMP(3),
ADD COLUMN     "dnsCheckedAt" TIMESTAMP(3),
ADD COLUMN     "dnsIps" JSONB,
ADD COLUMN     "robotsTxtBlocksAll" BOOLEAN,
ADD COLUMN     "robotsTxtCheckedAt" TIMESTAMP(3),
ADD COLUMN     "robotsTxtHash" TEXT;
