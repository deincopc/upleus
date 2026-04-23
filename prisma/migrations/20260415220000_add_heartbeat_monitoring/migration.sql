-- AlterEnum
ALTER TYPE "MonitorType" ADD VALUE 'HEARTBEAT';

-- AlterTable
ALTER TABLE "Monitor" ADD COLUMN "heartbeatToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Monitor_heartbeatToken_key" ON "Monitor"("heartbeatToken");
