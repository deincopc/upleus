import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Logo } from "@/components/Logo";
import { StatusRefresh } from "@/components/status/StatusRefresh";
import { PastIncidentsList } from "@/components/status/PastIncidentsList";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return {};
  return {
    title: `${project.name} — Status`,
    description: project.statusDescription ?? `Live status page for ${project.name}. Check uptime and recent incidents.`,
  };
}

function uptimePercent(up: number, total: number): string {
  if (total === 0) return "—";
  return ((up / total) * 100).toFixed(2) + "%";
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function buildDayBuckets(checks: { isUp: boolean; checkedAt: Date }[], days = 30) {
  const now = new Date();
  const buckets: { date: string; up: number; total: number }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    buckets.push({ date: dayKey(d), up: 0, total: 0 });
  }

  const byDay = new Map(buckets.map((b) => [b.date, b]));

  for (const c of checks) {
    const key = dayKey(c.checkedAt);
    const bucket = byDay.get(key);
    if (bucket) {
      bucket.total++;
      if (c.isUp) bucket.up++;
    }
  }

  return buckets;
}

const STATUS_LABELS: Record<string, string> = {
  investigating: "Investigating",
  identified: "Identified",
  monitoring: "Monitoring",
  resolved: "Resolved",
};

const STATUS_DOT: Record<string, string> = {
  investigating: "bg-red-400",
  identified: "bg-amber-400",
  monitoring: "bg-blue-400",
  resolved: "bg-emerald-400",
};

interface IncidentCardProps {
  incident: {
    id: string;
    monitorName: string;
    startedAt: Date;
    resolvedAt: Date | null;
    durationMs: number | null;
    incidentUpdates: { id: string; status: string; message: string; createdAt: Date }[];
    latestUpdateStatus: string | null;
  };
  fmtDuration?: (ms: number) => string;
}

function IncidentCard({ incident, fmtDuration }: IncidentCardProps) {
  const isResolved = !!(incident.resolvedAt || incident.latestUpdateStatus === "resolved");
  const latestUpdateStatus = incident.latestUpdateStatus;

  const statusBadge = isResolved
    ? { label: "Resolved", cls: "bg-emerald-50 text-emerald-700" }
    : latestUpdateStatus === "monitoring"
    ? { label: "Monitoring", cls: "bg-blue-50 text-blue-700" }
    : latestUpdateStatus === "identified"
    ? { label: "Identified", cls: "bg-amber-50 text-amber-700" }
    : { label: "Investigating", cls: "bg-red-50 text-red-600" };

  return (
    <div className={`bg-white border rounded-2xl px-5 py-4 ${isResolved ? "border-gray-200" : "border-red-200"}`}>
      <div className="flex items-start justify-between gap-4 mb-1">
        <div className="flex items-center gap-2.5">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${isResolved ? "bg-gray-300" : "bg-red-400"}`} />
          <div>
            <p className="text-sm font-medium text-gray-900">{incident.monitorName}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {isResolved ? "Resolved" : "Outage"} · {timeAgo(incident.startedAt)}
              {incident.durationMs && fmtDuration ? ` · lasted ${fmtDuration(incident.durationMs)}` : ""}
            </p>
          </div>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${statusBadge.cls}`}>
          {statusBadge.label}
        </span>
      </div>

      {incident.incidentUpdates.length > 0 && (
        <div className="mt-3 space-y-2 pl-4 border-l-2 border-gray-100">
          {incident.incidentUpdates.map((u) => (
            <div key={u.id} className="flex items-start gap-2">
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${STATUS_DOT[u.status] ?? "bg-gray-300"}`} />
              <div>
                <span className="text-xs font-semibold text-gray-600">{STATUS_LABELS[u.status] ?? u.status}</span>
                <span className="text-xs text-gray-400 ml-2">{timeAgo(u.createdAt)}</span>
                <p className="text-xs text-gray-500 mt-0.5">{u.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function StatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const now = new Date();
  const since30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const [project, activeWindows, upcomingWindows] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: {
        monitors: {
          where: { isActive: true },
          orderBy: { createdAt: "asc" },
          include: {
            checks: {
              where: { checkedAt: { gte: since30d } },
              orderBy: { checkedAt: "asc" },
              select: { isUp: true, checkedAt: true },
            },
            alerts: {
              where: { type: { in: ["DOWN", "RECOVERED"] }, sentAt: { gte: since30d } },
              orderBy: { sentAt: "desc" },
              take: 20,
              include: {
                incidentUpdates: { orderBy: { createdAt: "asc" } },
              },
            },
          },
        },
      },
    }),
    prisma.maintenanceWindow.findMany({
      where: { monitor: { project: { id } }, startsAt: { lte: now }, endsAt: { gte: now } },
      select: { monitorId: true, name: true, endsAt: true },
    }),
    prisma.maintenanceWindow.findMany({
      where: { monitor: { project: { id } }, startsAt: { gt: now, lte: next24h } },
      orderBy: { startsAt: "asc" },
      select: { monitorId: true, name: true, startsAt: true, endsAt: true },
    }),
  ]);

  if (!project) notFound();

  const monitors = project.monitors;

  type ActiveWindow = (typeof activeWindows)[number];
  type UpcomingWindow = (typeof upcomingWindows)[number];
  type StatusMonitor = (typeof monitors)[number];
  type MonitorAlertRow = StatusMonitor["alerts"][number];

  const inMaintenanceIds = new Set(activeWindows.map((w: ActiveWindow) => w.monitorId));

  // Exclude monitors in active maintenance from the overall status calculation
  const nonMaintenanceMonitors = monitors.filter((m: StatusMonitor) => !inMaintenanceIds.has(m.id));
  const someDown = nonMaintenanceMonitors.some((m: StatusMonitor) => !m.isUp);
  const allDown = nonMaintenanceMonitors.length > 0 && nonMaintenanceMonitors.every((m: StatusMonitor) => !m.isUp);

  const statusLabel = allDown ? "Major outage" : someDown ? "Partial outage" : "All systems operational";
  const statusBg = allDown ? "from-red-50 to-white border-red-100" : someDown ? "from-yellow-50 to-white border-yellow-100" : "from-emerald-50 to-white border-emerald-100";
  const statusText = allDown ? "text-red-700" : someDown ? "text-yellow-700" : "text-emerald-700";

  // Match each DOWN alert with its next RECOVERED alert (each recovery consumed once)
  interface Incident {
    id: string;
    monitorName: string;
    monitorId: string;
    startedAt: Date;
    resolvedAt: Date | null;
    durationMs: number | null;
    incidentUpdates: { id: string; status: string; message: string; createdAt: Date }[];
    latestUpdateStatus: string | null;
  }

  const incidents: Incident[] = [];
  for (const m of monitors) {
    const sorted = [...m.alerts].sort((a: MonitorAlertRow, b: MonitorAlertRow) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
    const downs = sorted.filter((a: MonitorAlertRow) => a.type === "DOWN");
    const recoveries = sorted.filter((a: MonitorAlertRow) => a.type === "RECOVERED").map((r: MonitorAlertRow) => ({ ...r, used: false }));

    for (const down of downs) {
      const downTime = new Date(down.sentAt).getTime();
      const recovery = recoveries.find((r) => !r.used && new Date(r.sentAt).getTime() > downTime);
      if (recovery) recovery.used = true;

      const resolvedAt = recovery ? new Date(recovery.sentAt) : null;
      const latestUpdate = down.incidentUpdates.at(-1);
      incidents.push({
        id: down.id,
        monitorName: m.name,
        monitorId: m.id,
        startedAt: new Date(down.sentAt),
        resolvedAt,
        durationMs: resolvedAt ? resolvedAt.getTime() - downTime : null,
        incidentUpdates: down.incidentUpdates,
        latestUpdateStatus: latestUpdate?.status ?? null,
      });
    }
  }
  incidents.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

  const oneDayAgo = now.getTime() - 24 * 60 * 60 * 1000;

  const isActive = (i: Incident) =>
    !i.resolvedAt && i.latestUpdateStatus !== "resolved" && i.startedAt.getTime() > oneDayAgo;

  // One active incident per monitor — most recent unresolved within 24h
  const activeByMonitor = new Map<string, Incident>();
  for (const i of incidents) {
    if (isActive(i) && !activeByMonitor.has(i.monitorId)) {
      activeByMonitor.set(i.monitorId, i);
    }
  }
  const activeIncidents = [...activeByMonitor.values()];

  // Past: resolved, manually resolved, or older than 24h — deduplicated to most recent per day per monitor
  const pastIncidents = incidents.filter(
    (i) => i.resolvedAt || i.latestUpdateStatus === "resolved" || i.startedAt.getTime() <= oneDayAgo
  );

  function fmtDuration(ms: number): string {
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 h-16 flex items-center justify-between">
        <div className="max-w-3xl w-full mx-auto flex items-center justify-between">
          <p className="font-semibold text-gray-900">{project.name}</p>
          <span className="text-xs text-gray-400">Status page</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">

        {/* Manual banner */}
        {project.statusBannerMessage && (
          <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
            <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <p className="text-sm text-amber-800 leading-relaxed">{project.statusBannerMessage}</p>
          </div>
        )}

        {/* Active maintenance banner */}
        {activeWindows.length > 0 && (
          <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
            <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800">Maintenance in progress</p>
              <p className="text-xs text-amber-700 mt-0.5 opacity-80">
                {activeWindows.map((w: ActiveWindow) => w.name).join(", ")} · alerts suppressed during this window
              </p>
            </div>
          </div>
        )}

        {/* Upcoming maintenance banner */}
        {upcomingWindows.length > 0 && (
          <div className="mb-6 flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-5 py-4">
            <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-800">Scheduled maintenance in the next 24 hours</p>
              <div className="mt-1 space-y-0.5">
                {upcomingWindows.map((w: UpcomingWindow) => (
                  <p key={`${w.monitorId}-${w.startsAt.toISOString()}`} className="text-xs text-blue-700 opacity-80">
                    {w.name} · {w.startsAt.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" })}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Overall status */}
        <div className={`relative border rounded-2xl p-8 mb-8 text-center overflow-hidden bg-gradient-to-b ${statusBg}`}>
          <div className="absolute inset-0 bg-dot-grid opacity-20 pointer-events-none" />
          <div className="relative">
            <div className={`inline-flex items-center gap-2.5 font-semibold text-lg ${statusText}`}>
              <div className={`w-3 h-3 rounded-full ${!someDown ? "animate-pulse bg-emerald-500" : allDown ? "bg-red-500" : "bg-yellow-500"}`} />
              {statusLabel}
            </div>
            <div className="flex items-center justify-center gap-3 mt-2">
              <p className="text-gray-400 text-sm">Updated {new Date().toUTCString()}</p>
              <StatusRefresh />
            </div>
            {project.statusDescription && (
              <p className="text-sm text-gray-500 mt-3 max-w-md mx-auto">{project.statusDescription}</p>
            )}
          </div>
        </div>

        {/* Services */}
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Services</h2>
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100">
            {monitors.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No monitors configured.</div>
            ) : (
              monitors.map((monitor: StatusMonitor) => {
                const isHeartbeat = monitor.type === "HEARTBEAT";
                const isTcp = monitor.type === "TCP";
                const inMaintenance = inMaintenanceIds.has(monitor.id);
                const statusOk = inMaintenance ? "Maintenance" : isHeartbeat ? (monitor.isUp ? "Operational" : "Missed") : (monitor.isUp ? "Operational" : "Outage");
                const displayUrl = isTcp && monitor.port ? `${monitor.url}:${monitor.port}` : monitor.url;
                const dayBuckets = buildDayBuckets(monitor.checks, 30);
                type DayBucket = (typeof dayBuckets)[number];
                const totalUp = dayBuckets.reduce((s: number, b: DayBucket) => s + b.up, 0);
                const totalChecks = dayBuckets.reduce((s: number, b: DayBucket) => s + b.total, 0);
                return (
                  <div key={monitor.id} className="px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${inMaintenance ? "bg-amber-400" : monitor.isUp ? "bg-emerald-500" : "bg-red-500"}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900">{monitor.name}</p>
                            {(isHeartbeat || isTcp) && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 font-medium">
                                {isHeartbeat ? "Heartbeat" : "TCP"}
                              </span>
                            )}
                          </div>
                          {!isHeartbeat && displayUrl && (
                            <p className="text-xs text-gray-400 font-mono mt-0.5">{displayUrl}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-gray-400">30-day uptime</p>
                          <p className="text-sm font-semibold text-gray-900">{uptimePercent(totalUp, totalChecks)}</p>
                        </div>
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          inMaintenance ? "bg-amber-50 text-amber-700"
                          : monitor.isUp ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-600"
                        }`}>
                          {statusOk}
                        </span>
                      </div>
                    </div>
                    {/* 90-day uptime bars */}
                    <div className="flex gap-0.5">
                      {dayBuckets.map((b: DayBucket, i: number) => (
                        <div
                          key={i}
                          title={b.total === 0 ? b.date + " — no data" : `${b.date} — ${uptimePercent(b.up, b.total)} uptime`}
                          className={`flex-1 h-6 rounded-sm transition-colors cursor-default ${
                            b.total === 0
                              ? "bg-slate-100"
                              : b.up === b.total
                              ? "bg-emerald-400 opacity-80"
                              : b.up === 0
                              ? "bg-red-400"
                              : "bg-amber-400"
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-gray-300">30 days ago</span>
                      <span className="text-xs text-gray-300">Today</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Active incidents */}
        {activeIncidents.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Active incidents</h2>
            <div className="space-y-3">
              {activeIncidents.map((incident) => (
                <IncidentCard key={incident.id} incident={incident} />
              ))}
            </div>
          </div>
        )}

        {/* Past incidents — paginated client component */}
        <PastIncidentsList incidents={pastIncidents.map((i) => ({
          ...i,
          startedAt: i.startedAt.toISOString(),
          resolvedAt: i.resolvedAt ? i.resolvedAt.toISOString() : null,
          incidentUpdates: i.incidentUpdates.map((u) => ({
            ...u,
            createdAt: u.createdAt.toISOString(),
          })),
        }))} />

        {incidents.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-gray-400">No incidents in the last 30 days.</p>
          </div>
        )}

      </main>

      <footer className="border-t border-gray-200 py-6 px-6 mt-12">
        <div className="max-w-3xl mx-auto flex items-center justify-center gap-2">
          {!project.statusHideBranding ? (
            <>
              <span className="text-xs text-gray-400">Powered by</span>
              <Logo href="/" height={20} />
            </>
          ) : (
            <span className="text-xs text-gray-400">{project.name}</span>
          )}
        </div>
      </footer>
    </div>
  );
}
