"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RescanButton({ monitorId }: { monitorId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleRescan() {
    setLoading(true);
    setError(null);
    setDone(false);
    try {
      const res = await fetch(`/api/monitors/${monitorId}/scan`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Scan failed");
      }
      setDone(true);
      router.refresh();
      setTimeout(() => setDone(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleRescan}
        disabled={loading}
        className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-900 dark:hover:text-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Scanning…" : done ? "Done" : "Rescan now"}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
