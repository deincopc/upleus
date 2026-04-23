"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface MaintenanceWindow {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
}

interface Props {
  monitorId: string;
  initialWindows: MaintenanceWindow[];
}

function fmtLocal(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function windowStatus(w: MaintenanceWindow): "active" | "upcoming" | "past" {
  const now = Date.now();
  const start = new Date(w.startsAt).getTime();
  const end = new Date(w.endsAt).getTime();
  if (now >= start && now <= end) return "active";
  if (now < start) return "upcoming";
  return "past";
}

export function MonitorMaintenanceSection({ monitorId, initialWindows }: Props) {
  const router = useRouter();
  const [windows, setWindows] = useState<MaintenanceWindow[]>(initialWindows);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", startsAt: "", endsAt: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monitorId,
          name: form.name,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: new Date(form.endsAt).toISOString(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to create window");
      }
      const created = await res.json();
      setWindows((prev) => [...prev, created].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()));
      setForm({ name: "", startsAt: "", endsAt: "" });
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/maintenance/${id}`, { method: "DELETE" });
      setWindows((prev) => prev.filter((w) => w.id !== id));
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  const active = windows.filter((w) => windowStatus(w) === "active");
  const upcoming = windows.filter((w) => windowStatus(w) === "upcoming");
  const past = windows.filter((w) => windowStatus(w) === "past");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Maintenance windows</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Alerts are suppressed during active windows.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
        >
          {showForm ? "Cancel" : "+ Schedule window"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col gap-3 bg-gray-50 dark:bg-gray-800/50">
          {error && (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Window name</label>
            <input
              required
              type="text"
              placeholder="e.g. Planned server migration"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Starts at</label>
              <input
                required
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Ends at</label>
              <input
                required
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="self-start bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving…" : "Schedule"}
          </button>
        </form>
      )}

      {active.length === 0 && upcoming.length === 0 && past.length === 0 && !showForm && (
        <p className="text-xs text-gray-400 dark:text-gray-500 py-2">No maintenance windows scheduled.</p>
      )}

      {active.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active</p>
          {active.map((w) => (
            <WindowRow key={w.id} w={w} status="active" onDelete={handleDelete} deletingId={deletingId} />
          ))}
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Upcoming</p>
          {upcoming.map((w) => (
            <WindowRow key={w.id} w={w} status="upcoming" onDelete={handleDelete} deletingId={deletingId} />
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Past</p>
          {past.map((w) => (
            <WindowRow key={w.id} w={w} status="past" onDelete={handleDelete} deletingId={deletingId} />
          ))}
        </div>
      )}
    </div>
  );
}

function WindowRow({
  w,
  status,
  onDelete,
  deletingId,
}: {
  w: MaintenanceWindow;
  status: "active" | "upcoming" | "past";
  onDelete: (id: string) => void;
  deletingId: string | null;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 px-4 py-3 rounded-lg border text-sm ${
      status === "active"
        ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20"
        : status === "upcoming"
        ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
        : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 opacity-60"
    }`}>
      <div className="min-w-0">
        <p className={`font-medium truncate ${
          status === "active" ? "text-amber-800 dark:text-amber-200"
          : status === "upcoming" ? "text-blue-800 dark:text-blue-200"
          : "text-gray-600 dark:text-gray-400"
        }`}>
          {w.name}
          {status === "active" && <span className="ml-2 text-xs font-normal">· Active now</span>}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {fmtLocal(w.startsAt)} → {fmtLocal(w.endsAt)}
        </p>
      </div>
      {status !== "past" && (
        <button
          type="button"
          onClick={() => onDelete(w.id)}
          disabled={deletingId === w.id}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 disabled:opacity-50"
        >
          {deletingId === w.id ? "…" : "Cancel"}
        </button>
      )}
    </div>
  );
}
