import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTestAlert } from "@/lib/alerter";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const monitor = await prisma.monitor.findFirst({
      where: { id, userId: user.id },
    });
    if (!monitor) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const allTo = [...new Set([user.email, ...monitor.recipients].map((e) => e.toLowerCase()))];

    // Promise.allSettled so one bad recipient doesn't prevent others from receiving
    const results = await Promise.allSettled(
      allTo.map((email) =>
        sendTestAlert(
          { ...monitor, user: { email: user.email, name: user.name } },
          email,
        )
      )
    );

    const failed = results
      .map((r, i) => (r.status === "rejected" ? allTo[i] : null))
      .filter((e): e is string => e !== null);

    if (failed.length > 0) {
      console.error(`[test-alert] failed to send to: ${failed.join(", ")}`);
    }

    return NextResponse.json({
      ok: true,
      sent: allTo.length - failed.length,
      failed,
    });
  } catch (err) {
    console.error("POST /api/monitors/[id]/test-alert error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
