"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

const INTERVAL_MS = 60_000;

export function StatusRefresh() {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(INTERVAL_MS / 1000);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(() => {
    setRefreshing(true);
    router.refresh();
    setSecondsLeft(INTERVAL_MS / 1000);
    setTimeout(() => setRefreshing(false), 800);
  }, [router]);

  // Auto-refresh every 60 s
  useEffect(() => {
    const interval = setInterval(refresh, INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  // Countdown tick
  useEffect(() => {
    const tick = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? INTERVAL_MS / 1000 : s - 1));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400">
        Refreshes in {secondsLeft}s
      </span>
      <button
        onClick={refresh}
        disabled={refreshing}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-50"
      >
        <svg
          className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Refresh
      </button>
    </div>
  );
}
