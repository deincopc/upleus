import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { MonitorCard } from "@/components/monitors/MonitorCard";
import { FREE_MONITORS_TOTAL } from "@/lib/config";

export default async function DashboardPage() {
  const { userId } = await auth();
  const clerkUser = await currentUser();

  // Select only the check fields MonitorCard actually uses (isUp, responseTime, checkedAt)
  // instead of pulling all columns from MonitorCheck on every dashboard load.
  const checksSelect = {
    orderBy: { checkedAt: "desc" as const },
    take: 30,
    select: { isUp: true, responseTime: true, checkedAt: true },
  };

  let user = await prisma.user.findUnique({
    where: { clerkId: userId! },
    include: {
      projects: {
        orderBy: { createdAt: "asc" },
        include: {
          monitors: {
            orderBy: { createdAt: "desc" },
            include: { checks: checksSelect },
          },
        },
      },
      monitors: {
        where: { projectId: null },
        orderBy: { createdAt: "desc" },
        include: { checks: checksSelect },
      },
    },
  });

  if (!user && clerkUser) {
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
    const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;
    user = await prisma.user.create({
      data: { clerkId: userId!, email, name },
      include: {
        projects: { orderBy: { createdAt: "asc" }, include: { monitors: { include: { checks: checksSelect } } } },
        monitors: { where: { projectId: null }, orderBy: { createdAt: "desc" }, include: { checks: checksSelect } },
      },
    });
  }

  const projects = user?.projects ?? [];
  const unassigned = user?.monitors ?? [];

  const allMonitors = [
    ...unassigned,
    ...projects.flatMap((p: { monitors: unknown[] }) => p.monitors),
  ];
  const totalMonitors = allMonitors.length;
  const atLimit = totalMonitors >= FREE_MONITORS_TOTAL;

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {projects.length} project{projects.length !== 1 ? "s" : ""} · {totalMonitors} monitor{totalMonitors !== 1 ? "s" : ""} total
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/projects/new"
            className="text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            + New project
          </Link>
          {atLimit ? (
            <span className="text-sm bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 px-4 py-2 rounded-lg font-medium cursor-not-allowed">
              + Add monitor
            </span>
          ) : (
            <Link
              href="/dashboard/monitors/new"
              className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors"
            >
              + Add monitor
            </Link>
          )}
        </div>
      </div>

      {/* Usage */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Free plan</p>
          <span className={`text-xs font-semibold ${atLimit ? "text-amber-600" : "text-gray-700 dark:text-gray-300"}`}>
            {totalMonitors} / {FREE_MONITORS_TOTAL} monitors
          </span>
        </div>
        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${atLimit ? "bg-amber-400" : "bg-emerald-500"}`}
            style={{ width: `${Math.min(100, (totalMonitors / FREE_MONITORS_TOTAL) * 100)}%` }}
          />
        </div>
      </div>

      {/* Projects */}
      {projects.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Projects</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project: { id: string; name: string; slug: string; monitors: { isUp: boolean }[] }) => {
              const someDown = project.monitors.some((m) => !m.isUp);
              return (
                <Link
                  key={project.id}
                  href={`/dashboard/projects/${project.id}`}
                  className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 hover:border-emerald-200 dark:hover:border-emerald-800 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/30 flex items-center justify-center transition-colors">
                      <svg className="w-4.5 h-4.5 text-gray-500 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      project.monitors.length === 0
                        ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
                        : someDown
                        ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                        : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                    }`}>
                      {project.monitors.length === 0
                        ? "No monitors"
                        : someDown
                        ? "Incident"
                        : "All up"}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{project.name}</h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                    {project.monitors.length} monitor{project.monitors.length !== 1 ? "s" : ""}
                  </p>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-xs font-mono text-gray-300 dark:text-gray-600 truncate">
                      /status/{project.slug}
                    </span>
                    <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              );
            })}

            {/* New project card */}
            <Link
              href="/dashboard/projects/new"
              className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-5 flex flex-col items-center justify-center text-center hover:border-emerald-200 dark:hover:border-emerald-800 hover:bg-emerald-50/20 dark:hover:bg-emerald-900/10 transition-all min-h-[160px]"
            >
              <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">New project</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Add a client or group</p>
            </Link>
          </div>
        </div>
      )}

      {/* Unassigned monitors */}
      {unassigned.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            {projects.length > 0 ? "Unassigned monitors" : "Monitors"}
          </h2>
          <div className="flex flex-col gap-3">
            {(unassigned as Parameters<typeof MonitorCard>[0]["monitor"][]).map((monitor) => (
              <MonitorCard key={monitor.id} monitor={monitor} />
            ))}
          </div>
        </div>
      )}

      {/* ── Full onboarding — brand new account ─────────────────── */}
      {projects.length === 0 && unassigned.length === 0 && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
          <div className="px-8 pt-10 pb-6 border-b border-gray-100 dark:border-gray-800 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Welcome to Upleus</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 max-w-sm mx-auto">
              Three steps to know when something breaks — before your users do.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 dark:divide-gray-800">
            {/* Step 1 */}
            <div className="p-7">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-7 h-7 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  1
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Add a monitor</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-5">
                Monitor websites, TCP ports, cron jobs, SSL certificates, or domain expiry. Know the moment something breaks.
              </p>
              <Link
                href="/dashboard/monitors/new"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                Add your first monitor
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>

            {/* Step 2 */}
            <div className="p-7">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  2
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Create a project</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-5">
                Projects group monitors together — one per client or product. Assign monitors to a project to enable the next step.
              </p>
              <Link
                href="/dashboard/projects/new"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors"
              >
                Create a project
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>

            {/* Step 3 */}
            <div className="p-7 opacity-50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  3
                </div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Share your status page</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-5">
                Every project gets a public URL — <span className="font-mono text-xs">upleus.com/status/your-project</span>. Share it with clients so they can check themselves before calling you.
              </p>
              <span className="text-xs text-gray-400 dark:text-gray-500 italic">Available once you have a project with monitors</span>
            </div>
          </div>
        </div>
      )}

      {/* ── "Status page" nudge — has monitors but no project ───── */}
      {unassigned.length > 0 && projects.length === 0 && (
        <div className="flex items-start gap-4 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4">
          <div className="w-8 h-8 rounded-xl bg-white border border-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-800">Create a project to get a public status page</p>
            <p className="text-sm text-emerald-700 mt-0.5 leading-relaxed">
              Projects group monitors together and generate a shareable status URL — useful for showing clients that everything&apos;s up, or for communicating during incidents.
            </p>
          </div>
          <Link
            href="/dashboard/projects/new"
            className="flex-shrink-0 text-sm font-semibold text-emerald-700 hover:text-emerald-800 transition-colors whitespace-nowrap"
          >
            Create project →
          </Link>
        </div>
      )}

      {/* ── "Assign monitors" nudge — project exists but is empty ─ */}
      {projects.length > 0 && projects.every((p: { monitors: { length: number } }) => p.monitors.length === 0) && unassigned.length > 0 && (
        <div className="flex items-start gap-4 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
          <div className="w-8 h-8 rounded-xl bg-white border border-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">Your project has no monitors yet</p>
            <p className="text-sm text-amber-700 mt-0.5 leading-relaxed">
              Assign monitors to your project to activate your status page. Open any project and use the &quot;Assign existing monitors&quot; section, or create a new monitor directly inside the project.
            </p>
          </div>
          <Link
            href={`/dashboard/projects/${projects[0].id}`}
            className="flex-shrink-0 text-sm font-semibold text-amber-700 hover:text-amber-800 transition-colors whitespace-nowrap"
          >
            Open project →
          </Link>
        </div>
      )}

    </div>
  );
}
