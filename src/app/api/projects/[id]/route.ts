import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/slug";
import { writeAuditLog } from "@/lib/audit";

async function getProjectForUser(projectId: string, clerkId: string) {
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) return null;
  return prisma.project.findFirst({ where: { id: projectId, userId: user.id } });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const project = await getProjectForUser(id, userId);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { name, statusDescription, statusBannerMessage, statusHideBranding } = await req.json();

    // Only regenerate slug when the name actually changes
    const nameChanged = name && name.trim() !== project.name;
    const slug = nameChanged ? await uniqueSlug(name, id) : undefined;

    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(slug && { slug }),
        ...(statusDescription !== undefined && { statusDescription: statusDescription || null }),
        ...(statusBannerMessage !== undefined && { statusBannerMessage: statusBannerMessage || null }),
        ...(statusHideBranding !== undefined && { statusHideBranding }),
      },
    });

    const changedFields = Object.entries({ name, statusDescription, statusBannerMessage, statusHideBranding })
      .filter(([, v]) => v !== undefined)
      .map(([k]) => k);
    await writeAuditLog(project.userId, "UPDATE", "PROJECT", id, { fields: changedFields });
    revalidatePath(`/status/${id}`);
    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/projects/[id] error:", err);
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
  const project = await getProjectForUser(id, userId);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Unassign monitors rather than delete them
  await prisma.monitor.updateMany({
    where: { projectId: id },
    data: { projectId: null },
  });

  await prisma.project.delete({ where: { id } });
  await writeAuditLog(project.userId, "DELETE", "PROJECT", id, { name: project.name });

  return NextResponse.json({ success: true });
}
