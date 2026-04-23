import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string; alertId: string }>;

export async function POST(req: Request, { params }: { params: Params }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: monitorId, alertId } = await params;

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const monitor = await prisma.monitor.findFirst({ where: { id: monitorId, userId: user.id } });
  if (!monitor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const alert = await prisma.alert.findFirst({ where: { id: alertId, monitorId } });
  if (!alert) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { message, status } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: "Message is required" }, { status: 400 });

  const validStatuses = ["investigating", "identified", "monitoring", "resolved"];
  if (!validStatuses.includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const update = await prisma.incidentUpdate.create({
    data: { alertId, message: message.trim(), status },
  });

  return NextResponse.json(update, { status: 201 });
}

export async function DELETE(req: Request, { params }: { params: Params }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: monitorId, alertId } = await params;
  const { searchParams } = new URL(req.url);
  const updateId = searchParams.get("updateId");
  if (!updateId) return NextResponse.json({ error: "updateId required" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const monitor = await prisma.monitor.findFirst({ where: { id: monitorId, userId: user.id } });
  if (!monitor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.incidentUpdate.deleteMany({ where: { id: updateId, alertId } });

  return NextResponse.json({ success: true });
}
