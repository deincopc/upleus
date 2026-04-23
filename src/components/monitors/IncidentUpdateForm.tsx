"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = [
  { value: "investigating", label: "Investigating" },
  { value: "identified", label: "Identified" },
  { value: "monitoring", label: "Monitoring" },
  { value: "resolved", label: "Resolved" },
] as const;

export function IncidentUpdateForm({
  monitorId,
  alertId,
}: {
  monitorId: string;
  alertId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string>("investigating");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch(
      `/api/monitors/${monitorId}/incidents/${alertId}/updates`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, message }),
      }
    );
    if (res.ok) {
      setMessage("");
      setStatus("investigating");
      setOpen(false);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save");
    }
    setSaving(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        + Add update
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
      <div className="flex gap-2 flex-wrap">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setStatus(s.value)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
              status === s.value
                ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-transparent"
                : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <textarea
        required
        rows={3}
        placeholder="Describe what's happening, what was found, or what was done to resolve it…"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="text-sm bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving…" : "Post update"}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null); }}
          className="text-sm text-gray-400 hover:text-gray-600 px-3 py-2"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
