import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type AuditAction = "CREATE" | "UPDATE" | "DELETE";
type AuditResource = "MONITOR" | "PROJECT";

export async function writeAuditLog(
  userId: string,
  action: AuditAction,
  resource: AuditResource,
  resourceId: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
        metadata: metadata as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (err) {
    // Audit log failures must never break the main request
    console.error("[audit] failed to write log:", err);
  }
}
