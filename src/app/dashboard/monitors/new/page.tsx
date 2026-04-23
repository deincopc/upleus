import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { MonitorForm } from "@/components/monitors/MonitorForm";
import Link from "next/link";

export default async function NewMonitorPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const { userId } = await auth();
  const { projectId } = await searchParams;

  const user = await prisma.user.findUnique({ where: { clerkId: userId! } });

  return (
    <div>
      <div className="mb-8">
        <Link
          href={projectId ? `/dashboard/projects/${projectId}` : "/dashboard"}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Back
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-4">Add monitor</h1>
        <p className="text-sm text-gray-500 mt-1">
          We&apos;ll check your site on your chosen interval and alert you when it goes down.
        </p>
      </div>
      <MonitorForm
        defaultValues={{ projectId }}
        ownerEmail={user?.email}
      />
    </div>
  );
}
