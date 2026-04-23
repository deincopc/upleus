import Link from "next/link";

type Alert = {
  id: string;
  type: string;
  sentAt: Date;
};

type Incident = {
  id: string;
  startedAt: Date;
  resolvedAt: Date | null;
  duration: string | null;
};

function buildIncidents(alerts: Alert[]): Incident[] {
  const sorted = [...alerts].sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
  const incidents: Incident[] = [];

  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].type !== "DOWN") continue;

    const down = sorted[i];
    const recovery = sorted.slice(i + 1).find((a) => a.type === "RECOVERED");

    const startedAt = new Date(down.sentAt);
    const resolvedAt = recovery ? new Date(recovery.sentAt) : null;

    let duration: string | null = null;
    if (resolvedAt) {
      const secs = Math.floor((resolvedAt.getTime() - startedAt.getTime()) / 1000);
      if (secs < 60) duration = `${secs}s`;
      else if (secs < 3600) duration = `${Math.floor(secs / 60)}m`;
      else duration = `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
    }

    incidents.push({ id: down.id, startedAt, resolvedAt, duration });
  }

  return incidents.reverse(); // most recent first
}

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function IncidentHistory({ alerts, monitorId }: { alerts: Alert[]; monitorId: string }) {
  const incidents = buildIncidents(alerts);

  if (incidents.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-8 text-center">
        <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center mx-auto mb-2">
          <svg className="w-4 h-4 text-emerald-500 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">No incidents recorded</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">This monitor has been healthy so far.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      {incidents.map((incident, i) => (
        <Link
          key={incident.id}
          href={`/dashboard/monitors/${monitorId}/incidents/${incident.id}`}
          className={`flex items-start gap-4 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group ${
            i > 0 ? "border-t border-gray-50 dark:border-gray-800" : ""
          }`}
        >
          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
            incident.resolvedAt ? "bg-gray-300 dark:bg-gray-600" : "bg-red-500 animate-pulse"
          }`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                incident.resolvedAt ? "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400" : "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"
              }`}>
                {incident.resolvedAt ? "Resolved" : "Ongoing"}
              </span>
              {incident.duration && (
                <span className="text-xs text-gray-400 dark:text-gray-500">Duration: {incident.duration}</span>
              )}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {formatDateTime(incident.startedAt)}
              {incident.resolvedAt && ` → ${formatDateTime(incident.resolvedAt)}`}
            </p>
          </div>
          <svg
            className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 flex-shrink-0 mt-1 transition-colors"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      ))}
    </div>
  );
}
