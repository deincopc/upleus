import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MonitorCard } from "@/components/monitors/MonitorCard";
import { CopyButton } from "@/components/CopyButton";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { AssignMonitorButton } from "@/components/projects/AssignMonitorButton";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  const { id } = await params;

  const user = await prisma.user.findUnique({ where: { clerkId: userId! } });
  if (!user) notFound();

  const project = await prisma.project.findFirst({
    where: { id, userId: user.id },
    include: {
      monitors: {
        orderBy: { createdAt: "desc" },
        include: { checks: { orderBy: { checkedAt: "desc" }, take: 30 } },
      },
    },
  });

  if (!project) notFound();

  type ProjectMonitor = (typeof project.monitors)[number];

  // Unassigned monitors available to add to this project
  const unassigned = await prisma.monitor.findMany({
    where: { userId: user.id, projectId: null },
    orderBy: { createdAt: "desc" },
  });

  type UnassignedMonitor = (typeof unassigned)[number];

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const statusUrl = `${appUrl}/status/${project.id}`;
  const someDown = project.monitors.some((m: ProjectMonitor) => !m.isUp);

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <Link href="/dashboard" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
          ← Dashboard
        </Link>
        <div className="flex items-center gap-3 mt-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{project.name}</h1>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            project.monitors.length === 0
              ? "bg-gray-100 text-gray-400"
              : someDown
              ? "bg-red-50 text-red-600"
              : "bg-emerald-50 text-emerald-700"
          }`}>
            {project.monitors.length === 0 ? "No monitors" : someDown ? "Incident" : "All up"}
          </span>
        </div>
      </div>

      {/* Status page link */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center">
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Public status page</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">{statusUrl}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <CopyButton text={statusUrl} />
          <Link
            href={`/status/${project.id}`}
            target="_blank"
            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
          >
            View →
          </Link>
        </div>
      </div>

      {/* Monitors */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Monitors ({project.monitors.length})
          </h2>
          <Link
            href={`/dashboard/monitors/new?projectId=${project.id}`}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
          >
            + New monitor
          </Link>
        </div>

        {project.monitors.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-10 text-center">
            <p className="text-gray-500 dark:text-gray-400 font-medium">No monitors in this project</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Add new monitors or assign existing ones below.</p>
            <Link
              href={`/dashboard/monitors/new?projectId=${project.id}`}
              className="inline-block mt-4 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              Add monitor
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {project.monitors.map((monitor: ProjectMonitor) => (
              <MonitorCard key={monitor.id} monitor={monitor} />
            ))}
          </div>
        )}
      </div>

      {/* Assign existing monitors */}
      {unassigned.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            Assign existing monitors
          </h2>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
            {unassigned.map((monitor: UnassignedMonitor) => (
              <div key={monitor.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{monitor.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">{monitor.url}</p>
                </div>
                <AssignMonitorButton monitorId={monitor.id} projectId={project.id} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit project */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Settings</h2>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
          <ProjectForm
            defaultValues={{
              id: project.id,
              name: project.name,
              statusDescription: project.statusDescription,
              statusBannerMessage: project.statusBannerMessage,
              statusHideBranding: project.statusHideBranding,
            }}
          />
        </div>
      </div>

    </div>
  );
}
