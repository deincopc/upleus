import { NextResponse } from "next/server";
import { runChecks } from "@/lib/runChecks";
import { prisma } from "@/lib/prisma";
import { timingSafeEqual } from "crypto";

// Called by Vercel Cron every minute.
// Protected by CRON_SECRET — Vercel injects this automatically on Pro.
//
// Sharding: to spread load across multiple invocations, add ?shard=0&total=2
// in vercel.json and duplicate the cron entry. Each shard processes only the
// monitors whose id hashes to that bucket.
export const maxDuration = 300; // seconds — requires Vercel Pro

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

  const { searchParams } = new URL(req.url);
  const shardIndex = searchParams.has("shard") ? parseInt(searchParams.get("shard")!, 10) : undefined;
  const totalShards = searchParams.has("total") ? parseInt(searchParams.get("total")!, 10) : undefined;

  try {
    // Verify DB is reachable before starting — prevents Vercel from marking the
    // cron as unhealthy and stopping retries when the database is temporarily down.
    await prisma.$queryRaw`SELECT 1`;

    const checked = await runChecks(shardIndex, totalShards);
    return NextResponse.json({ ok: true, checked, shard: shardIndex ?? "all" });
  } catch (err) {
    console.error("Cron check run failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
