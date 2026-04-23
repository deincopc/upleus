-- AlterTable
ALTER TABLE "Monitor" ADD COLUMN     "jsonAssertExpected" TEXT,
ADD COLUMN     "jsonAssertFailed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "jsonAssertPath" TEXT;

-- CreateTable
CREATE TABLE "IncidentUpdate" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IncidentUpdate_alertId_idx" ON "IncidentUpdate"("alertId");

-- AddForeignKey
ALTER TABLE "IncidentUpdate" ADD CONSTRAINT "IncidentUpdate_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "Alert"("id") ON DELETE CASCADE ON UPDATE CASCADE;
