import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { IncidentUpdateForm } from "@/components/monitors/IncidentUpdateForm";

function fmt(date: Date): string {
  return new Date(date).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function fmtTime(date: Date): string {
  return new Date(date).toLocaleString("en-GB", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function buildDuration(start: Date, end: Date): string {
  const secs = Math.floor((end.getTime() - start.getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
}

const STATUS_LABELS: Record<string, string> = {
  investigating: "Investigating",
  identified: "Identified",
  monitoring: "Monitoring",
  resolved: "Resolved",
};

const STATUS_COLORS: Record<string, string> = {
  investigating: "bg-red-50 text-red-700 border-red-100",
  identified: "bg-amber-50 text-amber-700 border-amber-100",
  monitoring: "bg-blue-50 text-blue-700 border-blue-100",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-100",
};

export default async function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string; alertId: string }>;
}) {
  const { userId } = await auth();
  const { id: monitorId, alertId } = await params;

  const user = await prisma.user.findUnique({ where: { clerkId: userId! } });
  if (!user) notFound();

  const monitor = await prisma.monitor.findFirst({
    where: { id: monitorId, userId: user.id },
  });
  if (!monitor) notFound();

  const downAlert = await prisma.alert.findFirst({
    where: { id: alertId, monitorId, type: "DOWN" },
    include: { incidentUpdates: { orderBy: { createdAt: "asc" } } },
  });
  if (!downAlert) notFound();

  const recoveredAlert = await prisma.alert.findFirst({
    where: { monitorId, type: "RECOVERED", sentAt: { gt: downAlert.sentAt } },
    orderBy: { sentAt: "asc" },
  });

  const incidentStart = downAlert.sentAt;
  const incidentEnd = recoveredAlert?.sentAt ?? new Date();
  const isOngoing = !recoveredAlert;

  const windowStart = new Date(incidentStart.getTime() - 90_000);
  const windowEnd = new Date(incidentEnd.getTime() + 90_000);

  const checks = await prisma.monitorCheck.findMany({
    where: { monitorId, checkedAt: { gte: windowStart, lte: windowEnd } },
    orderBy: { checkedAt: "asc" },
  });

  type Check = (typeof checks)[number];

  const downChecks = checks.filter(
    (c: Check) => !c.isUp && c.checkedAt >= incidentStart && c.checkedAt <= incidentEnd,
  );

  const firstError = downChecks[0]?.error ?? null;
  const duration = recoveredAlert
    ? buildDuration(incidentStart, recoveredAlert.sentAt)
    : buildDuration(incidentStart, new Date());

  const MAX_SHOWN = 5;
  const intermediateChecks = downChecks.slice(1);
  const shouldCollapse = intermediateChecks.length > MAX_SHOWN;
  const visibleBefore = shouldCollapse ? intermediateChecks.slice(0, 2) : intermediateChecks;
  const visibleAfter = shouldCollapse ? intermediateChecks.slice(-2) : [];
  const collapsedCount = shouldCollapse ? intermediateChecks.length - 4 : 0;

  const beforeChecks = checks
    .filter((c: Check) => c.isUp && c.checkedAt < incidentStart)
    .slice(-3);

  const recoveryCheck = recoveredAlert
    ? checks.find((c: Check) => c.isUp && c.checkedAt >= recoveredAlert.sentAt)
    : null;

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-2 text-sm text-gray-400">
        <Link href="/dashboard" className="hover:text-gray-600 transition-colors">Dashboard</Link>
        <span>/</span>
        <Link href={`/dashboard/monitors/${monitorId}`} className="hover:text-gray-600 transition-colors">
          {monitor.name}
        </Link>
        <span>/</span>
        <span className="text-gray-600">Incident</span>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isOngoing ? "bg-red-500 animate-pulse" : "bg-gray-300"}`} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {isOngoing ? "Ongoing incident" : "Incident"}
          </h1>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            isOngoing ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500"
          }`}>
            {isOngoing ? "Ongoing" : "Resolved"}
          </span>
        </div>
        <p className="text-sm text-gray-500 ml-6">{monitor.name}</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Duration</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{duration}</p>
          {isOngoing && <p className="text-xs text-red-500 mt-0.5">Still ongoing</p>}
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Detected</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug">{fmt(incidentStart)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">{isOngoing ? "Last check" : "Recovered"}</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug">
            {recoveredAlert ? fmt(recoveredAlert.sentAt) : "—"}
          </p>
        </div>
      </div>

      {firstError && (
        <div className="mb-8 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
          <p className="text-xs font-semibold text-red-600 mb-0.5 uppercase tracking-wide">Error</p>
          <p className="text-sm text-red-700 font-mono">{firstError}</p>
        </div>
      )}

      {/* Incident updates / post-mortem */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Incident updates</h2>

        {downAlert.incidentUpdates.length > 0 && (
          <div className="space-y-3 mb-4">
            {downAlert.incidentUpdates.map((u) => (
              <div key={u.id} className={`border rounded-xl px-4 py-3 ${STATUS_COLORS[u.status] ?? "bg-gray-50 text-gray-700 border-gray-200"}`}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    {STATUS_LABELS[u.status] ?? u.status}
                  </span>
                  <span className="text-xs opacity-60">{fmt(u.createdAt)}</span>
                </div>
                <p className="text-sm">{u.message}</p>
              </div>
            ))}
          </div>
        )}

        <IncidentUpdateForm monitorId={monitorId} alertId={alertId} />
      </div>

      {/* Timeline */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Timeline</h2>
        <div className="relative">
          <div className="absolute left-[7px] top-3 bottom-3 w-px bg-gray-200" />
          <div className="space-y-0">

            {beforeChecks.map((check) => (
              <div key={check.id} className="flex items-start gap-4 pb-3">
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-200 border-2 border-emerald-300 flex-shrink-0 mt-0.5 relative z-10" />
                <div className="pb-0 min-w-0">
                  <span className="text-xs text-gray-400 font-mono">{fmtTime(check.checkedAt)}</span>
                  <span className="text-xs text-gray-400 ml-2">
                    Up {check.responseTime ? `· ${check.responseTime}ms` : ""}
                  </span>
                </div>
              </div>
            ))}

            {downChecks[0] && (
              <div className="flex items-start gap-4 pb-4">
                <div className="w-3.5 h-3.5 rounded-full bg-red-500 flex-shrink-0 mt-0.5 relative z-10 shadow-sm shadow-red-200" />
                <div className="flex-1 bg-red-50 border border-red-100 rounded-xl px-4 py-3 -mt-0.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-red-700">Monitor went down</span>
                    <span className="text-xs text-red-400 font-mono">{fmtTime(downChecks[0].checkedAt)}</span>
                  </div>
                  {downChecks[0].error && (
                    <p className="text-xs text-red-600 font-mono mt-1 opacity-80">{downChecks[0].error}</p>
                  )}
                </div>
              </div>
            )}

            {visibleBefore.map((check) => (
              <div key={check.id} className="flex items-start gap-4 pb-3">
                <div className="w-3.5 h-3.5 rounded-full bg-red-200 border-2 border-red-300 flex-shrink-0 mt-0.5 relative z-10" />
                <div className="min-w-0">
                  <span className="text-xs text-gray-500 font-mono">{fmtTime(check.checkedAt)}</span>
                  <span className="text-xs text-gray-400 ml-2">Check failed</span>
                  {check.error && (
                    <span className="text-xs text-gray-400 ml-1 font-mono truncate"> · {check.error}</span>
                  )}
                </div>
              </div>
            ))}

            {shouldCollapse && collapsedCount > 0 && (
              <div className="flex items-center gap-4 pb-3">
                <div className="w-3.5 flex-shrink-0 flex justify-center relative z-10">
                  <div className="flex flex-col gap-0.5">
                    <div className="w-1 h-1 rounded-full bg-gray-300 mx-auto" />
                    <div className="w-1 h-1 rounded-full bg-gray-300 mx-auto" />
                    <div className="w-1 h-1 rounded-full bg-gray-300 mx-auto" />
                  </div>
                </div>
                <span className="text-xs text-gray-400 italic">{collapsedCount} more failed checks</span>
              </div>
            )}

            {visibleAfter.map((check) => (
              <div key={check.id} className="flex items-start gap-4 pb-3">
                <div className="w-3.5 h-3.5 rounded-full bg-red-200 border-2 border-red-300 flex-shrink-0 mt-0.5 relative z-10" />
                <div className="min-w-0">
                  <span className="text-xs text-gray-500 font-mono">{fmtTime(check.checkedAt)}</span>
                  <span className="text-xs text-gray-400 ml-2">Check failed</span>
                </div>
              </div>
            ))}

            {recoveredAlert && (
              <div className="flex items-start gap-4 pb-3">
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex-shrink-0 mt-0.5 relative z-10 shadow-sm shadow-emerald-200" />
                <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 -mt-0.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-emerald-700">Monitor recovered</span>
                    <span className="text-xs text-emerald-500 font-mono">{fmtTime(recoveredAlert.sentAt)}</span>
                  </div>
                  {recoveryCheck?.responseTime && (
                    <p className="text-xs text-emerald-600 mt-1">Response time: {recoveryCheck.responseTime}ms</p>
                  )}
                </div>
              </div>
            )}

            {isOngoing && (
              <div className="flex items-start gap-4">
                <div className="w-3.5 h-3.5 rounded-full bg-red-400 animate-pulse flex-shrink-0 mt-0.5 relative z-10" />
                <div className="flex-1 bg-red-50 border border-dashed border-red-200 rounded-xl px-4 py-3 -mt-0.5">
                  <span className="text-sm font-semibold text-red-600">Still down</span>
                  <p className="text-xs text-red-400 mt-0.5">Monitor has not recovered yet</p>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {downChecks.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-100 flex items-center gap-6 text-xs text-gray-400">
          <span>{downChecks.length} failed check{downChecks.length !== 1 ? "s" : ""} during this incident</span>
          {recoveredAlert && <span>Total downtime: {duration}</span>}
        </div>
      )}
    </div>
  );
}
