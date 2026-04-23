import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { userId } = await auth();
  const user = await prisma.user.findUnique({ where: { clerkId: userId! } });
  if (!user) return NextResponse.json([], { status: 200 });

  const { searchParams } = new URL(req.url);
  const monitorId = searchParams.get("monitorId");

  const windows = await prisma.maintenanceWindow.findMany({
    where: { userId: user.id, ...(monitorId ? { monitorId } : {}) },
    include: { monitor: { select: { id: true, name: true } } },
    orderBy: { startsAt: "asc" },
  });

  return NextResponse.json(windows);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  const user = await prisma.user.findUnique({ where: { clerkId: userId! } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { monitorId, name, startsAt, endsAt } = body;

  if (!monitorId || !name || !startsAt || !endsAt)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  if (new Date(endsAt) <= new Date(startsAt))
    return NextResponse.json({ error: "End must be after start" }, { status: 400 });

  const monitor = await prisma.monitor.findFirst({ where: { id: monitorId, userId: user.id } });
  if (!monitor) return NextResponse.json({ error: "Monitor not found" }, { status: 404 });

  const window = await prisma.maintenanceWindow.create({
    data: { userId: user.id, monitorId, name, startsAt: new Date(startsAt), endsAt: new Date(endsAt) },
    include: { monitor: { select: { id: true, name: true } } },
  });

  return NextResponse.json(window, { status: 201 });
}
