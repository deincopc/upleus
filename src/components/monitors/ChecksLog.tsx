"use client";

import { useState } from "react";

type Check = {
  id: string;
  isUp: boolean;
  statusCode: number | null;
  responseTime: number | null;
  checkedAt: Date;
  error: string | null;
};

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

const PAGE_SIZE = 10;

export function ChecksLog({ checks }: { checks: Check[] }) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);

  // Bars: show last 30, oldest left → newest right
  const bars = checks.slice(0, 30).reverse();
  const pageChecks = checks.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(checks.length / PAGE_SIZE);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      {/* Heartbeat bar — always visible */}
      <div className="px-4 pt-4 pb-3">
        {checks.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">No checks yet.</p>
        ) : (
          <div className="flex items-end gap-0.5 h-8">
            {bars.map((c) => (
              <div
                key={c.id}
                title={`${timeAgo(c.checkedAt)} · ${c.isUp ? `${c.statusCode ?? "Up"} · ${c.responseTime}ms` : `Down${c.error ? ` · ${c.error}` : ""}`}`}
                className={`flex-1 rounded-sm transition-opacity hover:opacity-70 ${
                  c.isUp ? "bg-emerald-400" : "bg-red-400"
                }`}
                style={{
                  height: c.isUp && c.responseTime
                    ? `${Math.min(100, Math.max(30, 100 - (c.responseTime / 20)))}%`
                    : c.isUp ? "60%" : "100%",
                }}
              />
            ))}
            {/* Pad with empty slots if fewer than 30 checks */}
            {Array.from({ length: Math.max(0, 30 - bars.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="flex-1 rounded-sm bg-gray-100 dark:bg-gray-800" style={{ height: "30%" }} />
            ))}
          </div>
        )}
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          Last {Math.min(checks.length, 30)} checks
          {checks.length > 0 && (
            <span className="ml-2">
              · <span className="text-emerald-600 dark:text-emerald-400 font-medium">{checks.filter(c => c.isUp).length}</span> up
              {checks.some(c => !c.isUp) && (
                <span> · <span className="text-red-500 font-medium">{checks.filter(c => !c.isUp).length}</span> down</span>
              )}
            </span>
          )}
        </p>
      </div>

      {/* Toggle */}
      {checks.length > 0 && (
        <div className="border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={() => setOpen(!open)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <span>Check log</span>
            <svg
              className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {open && (
            <>
              <table className="w-full text-sm border-t border-gray-100 dark:border-gray-800">
                <thead>
                  <tr className="text-left text-xs text-gray-400 dark:text-gray-500 bg-gray-50/50 dark:bg-gray-800/50">
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Response</th>
                    <th className="px-4 py-2.5">Time</th>
                    <th className="px-4 py-2.5 hidden sm:table-cell">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {pageChecks.map((check) => (
                    <tr key={check.id} className="border-t border-gray-50 dark:border-gray-800">
                      <td className="px-4 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            check.isUp
                              ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                              : "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                          }`}
                        >
                          {check.isUp ? (check.statusCode ?? "Up") : "Down"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-xs">
                        {check.responseTime ? `${check.responseTime}ms` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-gray-400 dark:text-gray-500 text-xs whitespace-nowrap">
                        {timeAgo(check.checkedAt)}
                      </td>
                      <td className="px-4 py-2.5 text-gray-400 dark:text-gray-500 text-xs hidden sm:table-cell truncate max-w-xs">
                        {check.error ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, checks.length)} of {checks.length}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page === 0}
                      className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      ← Prev
                    </button>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page >= totalPages - 1}
                      className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
