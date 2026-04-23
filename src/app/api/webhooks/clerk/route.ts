import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ClerkUserData = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email_addresses?: { email_address: string }[];
};

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error("CLERK_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const headersList = await headers();
  const svixId = headersList.get("svix-id");
  const svixTimestamp = headersList.get("svix-timestamp");
  const svixSignature = headersList.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing webhook headers" }, { status: 400 });
  }

  const body = await req.text();

  let payload: { type: string; data: ClerkUserData };
  try {
    payload = new Webhook(secret).verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as { type: string; data: ClerkUserData };
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const { type, data } = payload;

  if (type === "user.created") {
    const email = data.email_addresses?.[0]?.email_address ?? "";
    const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || null;
    await prisma.user.upsert({
      where: { clerkId: data.id },
      update: { email, name },
      create: { clerkId: data.id, email, name },
    });
  }

  if (type === "user.updated") {
    const email = data.email_addresses?.[0]?.email_address ?? "";
    const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || null;
    await prisma.user.updateMany({ where: { clerkId: data.id }, data: { email, name } });
  }

  if (type === "user.deleted") {
    await prisma.user.deleteMany({ where: { clerkId: data.id } });
  }

  return NextResponse.json({ success: true });
}
