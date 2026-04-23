import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendRecoveryAlert } from "@/lib/alerter";

// In-memory rate limiter for failed token lookups (guards against token enumeration).
// Keyed by IP address: tracks failure count and window start time.
const failureWindow = 60_000; // 1 minute
const maxFailures = 10;
const ipFailures = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipFailures.get(ip);
  if (!entry || now - entry.windowStart > failureWindow) {
    ipFailures.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count > maxFailures;
}

async function handlePing(token: string, req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: CORS_HEADERS });
  }

  const monitor = await prisma.monitor.findUnique({
    where: { heartbeatToken: token },
    include: { user: { select: { email: true, name: true } } },
  });

  if (!monitor || !monitor.isActive) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: CORS_HEADERS });
  }

  // Rate limit: reject pings faster than half the monitor's check interval
  if (monitor.lastCheckedAt) {
    const minGapMs = (monitor.intervalMinutes * 60 * 1000) / 2;
    const msSinceLast = Date.now() - new Date(monitor.lastCheckedAt).getTime();
    if (msSinceLast < minGapMs) {
      return NextResponse.json(
        { error: "Too many pings", retryAfterMs: Math.ceil(minGapMs - msSinceLast) },
        { status: 429, headers: CORS_HEADERS }
      );
    }
  }

  const wasUp = monitor.isUp;
  // nextCheckAt = now + interval + 1 min grace
  const nextCheckAt = new Date(Date.now() + (monitor.intervalMinutes + 1) * 60 * 1000);

  await prisma.$transaction([
    prisma.monitorCheck.create({
      data: { monitorId: monitor.id, isUp: true, statusCode: null, responseTime: null, error: null },
    }),
    prisma.monitor.update({
      where: { id: monitor.id },
      data: { isUp: true, lastCheckedAt: new Date(), nextCheckAt },
    }),
  ]);

  if (!wasUp) {
    console.log(`HEARTBEAT RECOVERED: ${monitor.name}`);
    await sendRecoveryAlert({ ...monitor, user: monitor.user });
    await prisma.alert.create({ data: { monitorId: monitor.id, type: "RECOVERED" } });
  }

  return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return handlePing(token, req);
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return handlePing(token, req);
}
