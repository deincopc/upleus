-- AlterTable
ALTER TABLE "Monitor" ADD COLUMN     "downSince" TIMESTAMP(3),
ADD COLUMN     "escalationRecipients" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "escalationThresholdMinutes" INTEGER;

-- CreateTable
CREATE TABLE "MaintenanceWindow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceWindow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaintenanceWindow_monitorId_idx" ON "MaintenanceWindow"("monitorId");

-- CreateIndex
CREATE INDEX "MaintenanceWindow_userId_idx" ON "MaintenanceWindow"("userId");

-- CreateIndex
CREATE INDEX "MaintenanceWindow_startsAt_endsAt_idx" ON "MaintenanceWindow"("startsAt", "endsAt");

-- AddForeignKey
ALTER TABLE "MaintenanceWindow" ADD CONSTRAINT "MaintenanceWindow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceWindow" ADD CONSTRAINT "MaintenanceWindow_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
