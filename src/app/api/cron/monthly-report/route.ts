import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMonthlyReport, type MonthlyMonitorStats } from "@/lib/alerter";
import { timingSafeEqual } from "crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
  const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const month = now.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const BATCH_SIZE = 100;
  let cursor: string | undefined;
  let sent = 0;

  // Process users in batches to avoid loading all users into memory at once.
  while (true) {
    const users = await prisma.user.findMany({
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      select: {
        id: true,
        email: true,
        name: true,
        monitors: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            url: true,
            type: true,
            port: true,
            checks: {
              where: { checkedAt: { gte: since } },
              select: { isUp: true, responseTime: true },
            },
            alerts: {
              where: { type: "DOWN", sentAt: { gte: since } },
              select: { id: true },
            },
          },
        },
      },
    });

    if (users.length === 0) break;
    cursor = users[users.length - 1].id;

    for (const user of users) {
      type UserMonitor = (typeof user.monitors)[number];
      type UserCheck = UserMonitor["checks"][number];
      const monitorStats: MonthlyMonitorStats[] = user.monitors
        .filter((m: UserMonitor) => m.checks.length > 0)
        .map((m: UserMonitor) => {
          const totalChecks = m.checks.length;
          const upChecks = m.checks.filter((c: UserCheck) => c.isUp).length;
          const responseTimes = m.checks
            .map((c: UserCheck) => c.responseTime)
            .filter((t: number | null): t is number => t !== null);
          const avgResponseTime =
            responseTimes.length > 0
              ? Math.round(responseTimes.reduce((s: number, t: number) => s + t, 0) / responseTimes.length)
              : null;

          return {
            id: m.id,
            name: m.name,
            url: m.url,
            type: m.type,
            port: m.port,
            totalChecks,
            upChecks,
            incidentCount: m.alerts.length,
            avgResponseTime,
          };
        });

      if (monitorStats.length === 0) continue;

      await sendMonthlyReport({ email: user.email, name: user.name }, monitorStats, month);
      sent++;
    }

    // All users processed in this batch; if fewer than batch size, we're done.
    if (users.length < BATCH_SIZE) break;
  }

  return NextResponse.json({ ok: true, sent });
}
