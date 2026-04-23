import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateWebhookUrl } from "@/lib/validateWebhookUrl";
import { writeAuditLog } from "@/lib/audit";

async function getMonitorForUser(monitorId: string, clerkId: string) {
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) return null;

  return prisma.monitor.findFirst({
    where: { id: monitorId, userId: user.id },
  });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify ownership before returning any data
  const owned = await getMonitorForUser(id, userId);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const monitor = await prisma.monitor.findUnique({
    where: { id },
    include: {
      checks: { orderBy: { checkedAt: "desc" }, take: 100 },
      alerts: { orderBy: { sentAt: "desc" }, take: 20 },
    },
  });

  if (!monitor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(monitor);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const monitor = await getMonitorForUser(id, userId);
    if (!monitor) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const { name, url, intervalMinutes, isActive, projectId, sslEnabled, recipients, port, responseTimeThreshold, webhookUrl, keywordExpected, jsonAssertPath, jsonAssertExpected, escalationThresholdMinutes, escalationRecipients } = body;

    if (webhookUrl) {
      const webhookError = validateWebhookUrl(webhookUrl);
      if (webhookError) return NextResponse.json({ error: webhookError }, { status: 400 });
    }

    const updated = await prisma.monitor.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(url !== undefined && { url }),
        ...(intervalMinutes !== undefined && { intervalMinutes: Math.max(3, intervalMinutes) }),
        ...(isActive !== undefined && { isActive }),
        ...(projectId !== undefined && {
          project: projectId ? { connect: { id: projectId } } : { disconnect: true },
        }),
        ...(sslEnabled !== undefined && { sslEnabled }),
        ...(Array.isArray(recipients) && { recipients }),
        ...(port !== undefined && { port: port ? Number(port) : null }),
        ...(responseTimeThreshold !== undefined && {
          responseTimeThreshold: responseTimeThreshold ? Number(responseTimeThreshold) : null,
        }),
        ...(webhookUrl !== undefined && { webhookUrl: webhookUrl || null }),
        ...(keywordExpected !== undefined && { keywordExpected: keywordExpected || null }),
        ...(jsonAssertPath !== undefined && { jsonAssertPath: jsonAssertPath || null }),
        ...(jsonAssertExpected !== undefined && { jsonAssertExpected: jsonAssertExpected || null }),
        ...(escalationThresholdMinutes !== undefined && {
          escalationThresholdMinutes: escalationThresholdMinutes ? Number(escalationThresholdMinutes) : null,
        }),
        ...(Array.isArray(escalationRecipients) && { escalationRecipients }),
      },
    });

    await writeAuditLog(monitor.userId, "UPDATE", "MONITOR", id, { fields: Object.keys(body) });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/monitors/[id] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const monitor = await getMonitorForUser(id, userId);
  if (!monitor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.monitor.delete({ where: { id } });
  await writeAuditLog(monitor.userId, "DELETE", "MONITOR", id, { name: monitor.name });

  return NextResponse.json({ success: true });
}
