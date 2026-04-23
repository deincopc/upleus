-- AlterTable
ALTER TABLE "Monitor" ADD COLUMN     "recipients" TEXT[] DEFAULT ARRAY[]::TEXT[];
