import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  const user = await prisma.user.findUnique({ where: { clerkId: userId! } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const window = await prisma.maintenanceWindow.findFirst({ where: { id, userId: user.id } });
  if (!window) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.maintenanceWindow.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
