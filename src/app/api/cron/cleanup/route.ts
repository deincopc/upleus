import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { timingSafeEqual } from "crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CHECKS_RETENTION_DAYS = 90;
const ALERTS_RETENTION_DAYS = 365;
const AUDIT_LOGS_RETENTION_DAYS = 365;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  const provided = authHeader ?? "";
  const valid =
    provided.length === expected.length &&
    timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  if (!valid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const checksCutoff = new Date(now.getTime() - CHECKS_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const alertsCutoff = new Date(now.getTime() - ALERTS_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const auditCutoff = new Date(now.getTime() - AUDIT_LOGS_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  try {
    const [checks, alerts, auditLogs] = await Promise.all([
      prisma.monitorCheck.deleteMany({ where: { checkedAt: { lt: checksCutoff } } }),
      prisma.alert.deleteMany({ where: { sentAt: { lt: alertsCutoff } } }),
      prisma.auditLog.deleteMany({ where: { createdAt: { lt: auditCutoff } } }),
    ]);

    console.log(
      `Cleanup: deleted ${checks.count} checks, ${alerts.count} alerts, ${auditLogs.count} audit logs`
    );

    return NextResponse.json({
      ok: true,
      deleted: {
        checks: checks.count,
        alerts: alerts.count,
        auditLogs: auditLogs.count,
      },
    });
  } catch (err) {
    console.error("Cleanup cron failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
