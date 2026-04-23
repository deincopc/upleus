import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/slug";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      projects: {
        orderBy: { createdAt: "asc" },
        include: {
          monitors: {
            include: { checks: { take: 1, orderBy: { checkedAt: "desc" } } },
          },
        },
      },
    },
  });

  return NextResponse.json(user?.projects ?? []);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const slug = await uniqueSlug(name);

  const project = await prisma.project.create({
    data: { userId: user.id, name: name.trim(), slug },
  });

  return NextResponse.json(project, { status: 201 });
}
