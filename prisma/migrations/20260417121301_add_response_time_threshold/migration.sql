-- AlterTable
ALTER TABLE "Monitor" ADD COLUMN     "isSlow" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "responseTimeThreshold" INTEGER;
