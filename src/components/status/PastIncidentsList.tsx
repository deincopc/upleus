"use client";

import { useState } from "react";

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

interface Incident {
  id: string;
  monitorName: string;
  startedAt: string;
  resolvedAt: string | null;
  durationMs: number | null;
  incidentUpdates: { id: string; status: string; message: string; createdAt: string }[];
  latestUpdateStatus: string | null;
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function fmtDuration(ms: number): string {
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

const PAGE_SIZE = 3;

export function PastIncidentsList({ incidents }: { incidents: Incident[] }) {
  const [shown, setShown] = useState(PAGE_SIZE);
  const visible = incidents.slice(0, shown);
  const remaining = incidents.length - shown;

  if (incidents.length === 0) return null;

  return (
    <div>
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Past incidents</h2>
      <div className="space-y-3">
        {visible.map((incident) => {
          const latestUpdateStatus = incident.latestUpdateStatus;
          const statusBadge =
            latestUpdateStatus === "monitoring"
              ? { label: "Monitoring", cls: "bg-blue-50 text-blue-700" }
              : latestUpdateStatus === "identified"
              ? { label: "Identified", cls: "bg-amber-50 text-amber-700" }
              : { label: "Resolved", cls: "bg-emerald-50 text-emerald-700" };

          return (
            <div key={incident.id} className="bg-white border border-gray-200 rounded-2xl px-5 py-4">
              <div className="flex items-start justify-between gap-4 mb-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1 bg-gray-300" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{incident.monitorName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Resolved · {timeAgo(incident.startedAt)}
                      {incident.durationMs ? ` · lasted ${fmtDuration(incident.durationMs)}` : ""}
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
        })}
      </div>

      {remaining > 0 && (
        <button
          onClick={() => setShown((s) => s + PAGE_SIZE)}
          className="mt-3 w-full py-2.5 text-xs font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors bg-white"
        >
          Show {Math.min(remaining, PAGE_SIZE)} more incident{Math.min(remaining, PAGE_SIZE) !== 1 ? "s" : ""} · {remaining} remaining
        </button>
      )}
    </div>
  );
}
