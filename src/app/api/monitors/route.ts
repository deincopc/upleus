import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkWordPress } from "@/lib/checks/wordpress";
import { checkDomain } from "@/lib/checks/domain";
import { randomBytes } from "crypto";
import { validateWebhookUrl } from "@/lib/validateWebhookUrl";
import { FREE_MONITORS_TOTAL } from "@/lib/config";
import { writeAuditLog } from "@/lib/audit";

// Time-window rate limit for monitor creation: max 20 per hour per user.
// Prevents abuse where a user cycles through the per-type count limit by
// creating and immediately deleting monitors.
const CREATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const CREATE_LIMIT = 20;
const createAttempts = new Map<string, { count: number; windowStart: number }>();

function isCreateRateLimited(userId: string): boolean {
  const now = Date.now();
  const entry = createAttempts.get(userId);
  if (!entry || now - entry.windowStart > CREATE_WINDOW_MS) {
    createAttempts.set(userId, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count > CREATE_LIMIT;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      monitors: {
        orderBy: { createdAt: "desc" },
        include: { checks: { take: 30, orderBy: { checkedAt: "desc" } } },
      },
    },
  });

  return NextResponse.json(user?.monitors ?? []);
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (isCreateRateLimited(userId)) {
      return NextResponse.json(
        { error: "Too many monitors created recently. Please wait before adding more." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { name, url, type, port, intervalMinutes, projectId, recipients, sslEnabled, responseTimeThreshold, webhookUrl, keywordExpected, jsonAssertPath, jsonAssertExpected } = body;

    const monitorType =
      type === "DOMAIN" ? "DOMAIN"
      : type === "TCP" ? "TCP"
      : type === "HEARTBEAT" ? "HEARTBEAT"
      : type === "WORDPRESS" ? "WORDPRESS"
      : "HTTP";

    if (monitorType === "HEARTBEAT") {
      if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    } else {
      if (!name || !url) {
        return NextResponse.json({ error: "Name and URL are required" }, { status: 400 });
      }
    }

    if (monitorType === "WORDPRESS") {
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          return NextResponse.json({ error: "WordPress URL must start with http:// or https://" }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: "WordPress URL must be a valid URL" }, { status: 400 });
      }
    }

    if (monitorType === "TCP" && !port) {
      return NextResponse.json({ error: "Port is required for TCP monitors" }, { status: 400 });
    }

    if (webhookUrl) {
      const webhookError = validateWebhookUrl(webhookUrl);
      if (webhookError) return NextResponse.json({ error: webhookError }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { _count: { select: { monitors: true } } },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (user._count.monitors >= FREE_MONITORS_TOTAL) {
      return NextResponse.json(
        { error: `Free plan allows up to ${FREE_MONITORS_TOTAL} monitors in total. Paid plans with higher limits are coming soon.` },
        { status: 403 }
      );
    }

    const heartbeatToken = monitorType === "HEARTBEAT" ? randomBytes(24).toString("hex") : undefined;

    const monitor = await prisma.monitor.create({
      data: {
        userId: user.id,
        type: monitorType,
        name,
        url: monitorType === "HEARTBEAT" ? null : url,
        intervalMinutes: Math.max(3, intervalMinutes ?? (monitorType === "DOMAIN" || monitorType === "WORDPRESS" ? 1440 : 3)),
        nextCheckAt: monitorType === "HEARTBEAT" ? new Date(Date.now() + 1e10) : new Date(),
        ...(monitorType === "HEARTBEAT" && { isUp: false }),
        ...(heartbeatToken && { heartbeatToken }),
        ...(port && { port: Number(port) }),
        ...(projectId && { projectId }),
        ...(Array.isArray(recipients) && { recipients }),
        ...(typeof sslEnabled === "boolean" && { sslEnabled }),
        ...(responseTimeThreshold != null && { responseTimeThreshold: Number(responseTimeThreshold) }),
        ...(webhookUrl && { webhookUrl }),
        ...(keywordExpected && { keywordExpected }),
        ...(jsonAssertPath && { jsonAssertPath }),
        ...(jsonAssertExpected && { jsonAssertExpected }),
      },
    });

    await writeAuditLog(user.id, "CREATE", "MONITOR", monitor.id, { name, type: monitorType });

    // TCP and Heartbeat monitors don't need any immediate check
    if (monitorType === "TCP" || monitorType === "HEARTBEAT") {
      return NextResponse.json(monitor, { status: 201 });
    }

    // WordPress — run an immediate full scan and return
    if (monitorType === "WORDPRESS") {
      const wpResult = await checkWordPress(url);
      const updated = await prisma.monitor.update({
        where: { id: monitor.id },
        data: {
          isUp: wpResult.isUp,
          lastCheckedAt: new Date(),
          nextCheckAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          wpVersion: wpResult.wpVersion,
          wpVersionStatus: wpResult.wpVersionStatus,
          wpLatestVersion: wpResult.wpLatestVersion,
          wpPlugins: wpResult.wpPlugins as object[],
          wpThemes: wpResult.wpThemes as object[],
          wpSecurityChecks: wpResult.wpSecurityChecks as object ?? undefined,
          wpInMaintenanceMode: wpResult.wpInMaintenanceMode,
          wpGaTrackingId: wpResult.wpGaTrackingId,
          wpGtmContainerId: wpResult.wpGtmContainerId,
          wpScannedAt: new Date(),
        },
      });
      await prisma.monitorCheck.create({
        data: {
          monitorId: monitor.id,
          isUp: wpResult.isUp,
          statusCode: wpResult.statusCode,
          responseTime: wpResult.responseTime,
          error: wpResult.error,
        },
      });
      return NextResponse.json(updated, { status: 201 });
    }

    // DOMAIN monitors — run an immediate WHOIS check so expiry data shows right away
    if (monitorType === "DOMAIN") {
      const domainResult = await checkDomain(url);
      const updated = await prisma.monitor.update({
        where: { id: monitor.id },
        data: {
          isUp: domainResult.valid,
          lastCheckedAt: new Date(),
          nextCheckAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          domainExpiresAt: domainResult.expiresAt,
          domainDaysUntilExpiry: domainResult.daysUntilExpiry,
          domainCheckedAt: new Date(),
        },
      });
      await prisma.monitorCheck.create({
        data: {
          monitorId: monitor.id,
          isUp: domainResult.valid,
          statusCode: null,
          responseTime: null,
          error: domainResult.error,
        },
      });
      return NextResponse.json(updated, { status: 201 });
    }

    // HTTP — return immediately, worker picks it up within the minute
    return NextResponse.json(monitor, { status: 201 });
  } catch (err) {
    console.error("POST /api/monitors error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
