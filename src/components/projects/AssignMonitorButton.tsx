"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AssignMonitorButton({
  monitorId,
  projectId,
}: {
  monitorId: string;
  projectId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function assign() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/monitors/${monitorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to assign monitor");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error, please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={assign}
        disabled={loading}
        className="text-xs text-emerald-600 hover:text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
      >
        {loading ? "Adding..." : "Add to project"}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
