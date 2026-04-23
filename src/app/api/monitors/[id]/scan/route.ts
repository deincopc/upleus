import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkWordPress } from "@/lib/checks/wordpress";

const SCAN_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const SCAN_LIMIT = 3;
const scanAttempts = new Map<string, { count: number; windowStart: number }>();

function isScanRateLimited(monitorId: string): boolean {
  const now = Date.now();
  const entry = scanAttempts.get(monitorId);
  if (!entry || now - entry.windowStart > SCAN_WINDOW_MS) {
    scanAttempts.set(monitorId, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count > SCAN_LIMIT;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const monitor = await prisma.monitor.findFirst({
    where: { id, userId: user.id, type: { in: ["WORDPRESS", "HTTP"] } },
  });
  if (!monitor) return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
  if (!monitor.wpVersion && !monitor.wpScannedAt && monitor.type !== "WORDPRESS") {
    return NextResponse.json({ error: "Monitor is not a WordPress site" }, { status: 400 });
  }
  if (!monitor.url) return NextResponse.json({ error: "Monitor has no URL" }, { status: 400 });

  if (isScanRateLimited(id)) {
    return NextResponse.json(
      { error: "Manual scan limit reached. You can trigger up to 3 scans per day per monitor." },
      { status: 429 }
    );
  }

  try {
    const result = await checkWordPress(monitor.url);

    const updated = await prisma.monitor.update({
      where: { id },
      data: {
        isUp: result.isUp,
        lastCheckedAt: new Date(),
        nextCheckAt: new Date(Date.now() + monitor.intervalMinutes * 60 * 1000),
        wpVersion: result.wpVersion,
        wpVersionStatus: result.wpVersionStatus,
        wpLatestVersion: result.wpLatestVersion,
        wpPlugins: result.wpPlugins as object[],
        wpThemes: result.wpThemes as object[],
        wpSecurityChecks: result.wpSecurityChecks as object ?? undefined,
        wpInMaintenanceMode: result.wpInMaintenanceMode,
        wpGaTrackingId: result.wpGaTrackingId,
        wpGtmContainerId: result.wpGtmContainerId,
        wpScannedAt: new Date(),
      },
    });

    await prisma.monitorCheck.create({
      data: {
        monitorId: id,
        isUp: result.isUp,
        statusCode: result.statusCode,
        responseTime: result.responseTime,
        error: result.error,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("POST /api/monitors/[id]/scan error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Scan failed" },
      { status: 500 },
    );
  }
}
