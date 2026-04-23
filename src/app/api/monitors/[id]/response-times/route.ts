import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const RANGE_CONFIG = {
  "24h": { hours: 24, bucketMinutes: 30, maxPoints: 48 },
  "7d":  { hours: 168, bucketMinutes: 180, maxPoints: 56 },
  "30d": { hours: 720, bucketMinutes: 720, maxPoints: 60 },
} as const;

type Range = keyof typeof RANGE_CONFIG;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const range = (searchParams.get("range") ?? "24h") as Range;
  const config = RANGE_CONFIG[range] ?? RANGE_CONFIG["24h"];

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const monitor = await prisma.monitor.findFirst({ where: { id, userId: user.id } });
  if (!monitor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const since = new Date(Date.now() - config.hours * 60 * 60 * 1000);

  const checks = await prisma.monitorCheck.findMany({
    where: { monitorId: id, checkedAt: { gte: since }, isUp: true, responseTime: { not: null } },
    select: { checkedAt: true, responseTime: true },
    orderBy: { checkedAt: "asc" },
  });

  // Bucket into time slots
  const bucketMs = config.bucketMinutes * 60 * 1000;
  const startMs = since.getTime();
  const nowMs = Date.now();
  const bucketCount = Math.ceil((nowMs - startMs) / bucketMs);

  const buckets: { sum: number; count: number }[] = Array.from({ length: bucketCount }, () => ({ sum: 0, count: 0 }));

  for (const check of checks) {
    const idx = Math.floor((check.checkedAt.getTime() - startMs) / bucketMs);
    if (idx >= 0 && idx < bucketCount && check.responseTime) {
      buckets[idx].sum += check.responseTime;
      buckets[idx].count += 1;
    }
  }

  const data = buckets.map((b, i) => ({
    time: new Date(startMs + i * bucketMs).toISOString(),
    value: b.count > 0 ? Math.round(b.sum / b.count) : null,
  }));

  return NextResponse.json({ data });
}
