"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RecipientsInput } from "./RecipientsInput";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type MonitorType = "HTTP" | "DOMAIN" | "TCP" | "HEARTBEAT" | "WORDPRESS";

interface MonitorFormProps {
  defaultValues?: {
    id?: string;
    type?: MonitorType;
    name?: string;
    url?: string;
    port?: number | null;
    intervalMinutes?: number;
    projectId?: string;
    recipients?: string[];
    sslEnabled?: boolean;
    heartbeatToken?: string | null;
    responseTimeThreshold?: number | null;
    webhookUrl?: string | null;
    keywordExpected?: string | null;
    jsonAssertPath?: string | null;
    jsonAssertExpected?: string | null;
    escalationThresholdMinutes?: number | null;
    escalationRecipients?: string[];
  };
  ownerEmail?: string;
}

const TYPE_OPTIONS: { value: MonitorType; label: string; desc: string }[] = [
  { value: "HTTP",      label: "HTTP / HTTPS", desc: "Uptime, response time & WordPress" },
  { value: "TCP",       label: "TCP port",     desc: "Database, SSH, Redis…" },
  { value: "HEARTBEAT", label: "Heartbeat",    desc: "Cron jobs & background tasks" },
];

export function MonitorForm({ defaultValues, ownerEmail }: MonitorFormProps) {
  const router = useRouter();
  const isEditing = !!defaultValues?.id;

  const [form, setForm] = useState({
    type: (defaultValues?.type ?? "HTTP") as MonitorType,
    name: defaultValues?.name ?? "",
    url: defaultValues?.url ?? "",
    port: defaultValues?.port ?? "",
    intervalMinutes: defaultValues?.intervalMinutes ?? 3,
    projectId: defaultValues?.projectId ?? null,
    recipients: defaultValues?.recipients ?? [],
    sslEnabled: defaultValues?.sslEnabled ?? true,
    responseTimeThreshold: defaultValues?.responseTimeThreshold ?? "",
    webhookUrl: defaultValues?.webhookUrl ?? "",
    keywordExpected: defaultValues?.keywordExpected ?? "",
    jsonAssertPath: defaultValues?.jsonAssertPath ?? "",
    jsonAssertExpected: defaultValues?.jsonAssertExpected ?? "",
    escalationThresholdMinutes: defaultValues?.escalationThresholdMinutes ?? "",
    escalationRecipients: defaultValues?.escalationRecipients ?? [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isDomain = form.type === "DOMAIN";
  const isTcp = form.type === "TCP";
  const isHeartbeat = form.type === "HEARTBEAT";
  const isWordPress = form.type === "WORDPRESS";

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Client-side validation
    const validationError = (() => {
      if (!form.name.trim()) return "Display name is required.";
      if (form.type === "HTTP" || form.type === "WORDPRESS") {
        if (!form.url.trim()) return "URL is required.";
        try {
          const parsed = new URL(form.url.trim());
          if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
            return "URL must start with http:// or https://";
        } catch {
          return "Please enter a valid URL (e.g. https://example.com)";
        }
      }
      if (form.type === "DOMAIN") {
        const d = form.url.trim();
        if (!d) return "Domain is required.";
        if (d.startsWith("http://") || d.startsWith("https://"))
          return "Enter the bare domain without https:// — e.g. example.com";
        if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/.test(d))
          return "Please enter a valid domain (e.g. example.com)";
      }
      if (form.type === "TCP") {
        if (!form.url.trim()) return "Host is required.";
        if (!form.port || Number(form.port) < 1 || Number(form.port) > 65535)
          return "Port must be between 1 and 65535.";
      }
      if (form.responseTimeThreshold !== "" && Number(form.responseTimeThreshold) < 1)
        return "Response time threshold must be at least 1ms.";
      if (form.webhookUrl) {
        try { new URL(form.webhookUrl); } catch {
          return "Webhook URL must be a valid URL (e.g. https://hooks.slack.com/...)";
        }
      }
      return null;
    })();

    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        isEditing ? `/api/monitors/${defaultValues!.id}` : "/api/monitors",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            port: form.port ? Number(form.port) : null,
            responseTimeThreshold: form.responseTimeThreshold !== "" ? Number(form.responseTimeThreshold) : null,
            webhookUrl: form.webhookUrl || null,
            keywordExpected: form.keywordExpected || null,
            jsonAssertPath: form.jsonAssertPath || null,
            jsonAssertExpected: form.jsonAssertExpected || null,
            escalationThresholdMinutes: form.escalationThresholdMinutes !== "" ? Number(form.escalationThresholdMinutes) : null,
          }),
        }
      );

      if (!res.ok) {
        let message = "Something went wrong";
        try {
          const data = await res.json();
          if (data.error) message = data.error;
        } catch { /* ignore non-JSON error bodies */ }
        throw new Error(message);
      }

      router.push(defaultValues?.projectId ? `/dashboard/projects/${defaultValues.projectId}` : "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    try {
      await fetch(`/api/monitors/${defaultValues!.id}`, { method: "DELETE" });
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const SectionHeader = ({ title }: { title: string }) => (
    <div className="pt-2 pb-1 border-b border-gray-100 dark:border-gray-800">
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{title}</p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* ── General ──────────────────────────────── */}
      <SectionHeader title="General" />

      {/* Monitor type — only shown when creating */}
      {!isEditing && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Monitor type</label>
          <div className="grid grid-cols-2 gap-2">
            {TYPE_OPTIONS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setForm({ ...form, type: t.value, url: "", port: "" })}
                className={`flex flex-col gap-0.5 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                  form.type === t.value
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                    : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <span className="text-xs font-semibold">{t.label}</span>
                <span className="text-xs opacity-60">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Display name</label>
        <input
          type="text"
          required
          placeholder={isDomain ? "Client A — example.com" : isTcp ? "Production DB" : isHeartbeat ? "Daily backup job" : isWordPress ? "Client A — WordPress" : "My Website"}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      {isTcp ? (
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Host</label>
            <input
              type="text"
              required
              placeholder="db.example.com"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Port</label>
            <input
              type="number"
              required
              placeholder="5432"
              min={1}
              max={65535}
              value={form.port}
              onChange={(e) => setForm({ ...form, port: e.target.value })}
              className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>
      ) : isWordPress ? (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">WordPress site URL</label>
          <input
            type="url"
            required
            placeholder="https://example.com"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500">We&apos;ll check version, security misconfigurations, and plugin exposure daily.</p>
        </div>
      ) : isHeartbeat ? (
        /* Heartbeat: no URL input — ping URL is auto-generated and shown on edit */
        isEditing && defaultValues?.heartbeatToken ? (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Ping URL</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/api/heartbeat/${defaultValues.heartbeatToken}`}
                className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 font-mono text-gray-600 dark:text-gray-400 select-all"
              />
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/api/heartbeat/${defaultValues.heartbeatToken}`)}
                className="px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
              >
                Copy
              </button>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">Call this URL at the end of each job run — GET or POST both work.</p>
          </div>
        ) : (
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-500 dark:text-gray-400">
            A unique ping URL will be generated after you save.
          </div>
        )
      ) : (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {isDomain ? "Domain name" : "URL to monitor"}
          </label>
          <input
            type={isDomain ? "text" : "url"}
            required
            placeholder={isDomain ? "example.com" : "https://example.com"}
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          {isDomain && (
            <p className="text-xs text-gray-400 dark:text-gray-500">Enter the bare domain without https:// — e.g. example.com</p>
          )}
          {!isDomain && (
            <p className="text-xs text-gray-400 dark:text-gray-500">WordPress sites are automatically detected — version and security checks run daily.</p>
          )}
        </div>
      )}

      {!isDomain && !isWordPress && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {isHeartbeat ? "Expected every" : "Check interval"}
          </label>
          <select
            value={form.intervalMinutes}
            onChange={(e) => setForm({ ...form, intervalMinutes: Number(e.target.value) })}
            className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value={3}>Every 3 minutes</option>
            <option value={5}>Every 5 minutes</option>
            <option value={10}>Every 10 minutes</option>
            <option value={30}>Every 30 minutes</option>
            <option value={60}>Every 1 hour</option>
            <option value={360}>Every 6 hours</option>
            <option value={720}>Every 12 hours</option>
            <option value={1440}>Every 24 hours</option>
          </select>
          {isHeartbeat && (
            <p className="text-xs text-gray-400 dark:text-gray-500">Alert if no ping is received within this window + 1 minute grace.</p>
          )}
        </div>
      )}

      {/* ── Alerting ─────────────────────────────── */}
      <SectionHeader title="Alerting" />

      <RecipientsInput
        value={form.recipients}
        onChange={(recipients) => setForm({ ...form, recipients })}
        ownerEmail={ownerEmail}
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Webhook URL <span className="text-gray-400 font-normal">(optional)</span></label>
        <input
          type="url"
          placeholder="https://hooks.slack.com/..."
          value={form.webhookUrl}
          onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })}
          className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-400 dark:text-gray-500">Receive a POST request on every alert event (down, recovered, SSL, domain expiry…).</p>
      </div>

      {/* Alert escalation */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col gap-4">
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Alert escalation <span className="text-gray-400 font-normal">(optional)</span></p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Send an escalation alert to additional recipients if the monitor stays down longer than a threshold.</p>
        </div>
        <div className="flex items-center justify-between gap-4">
          <label className="text-sm text-gray-600 dark:text-gray-400">Escalate after</label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={1}
              max={1440}
              placeholder="e.g. 30"
              value={form.escalationThresholdMinutes}
              onChange={(e) => setForm({ ...form, escalationThresholdMinutes: e.target.value })}
              className="w-20 border border-gray-300 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-right bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">min of downtime</span>
          </div>
        </div>
        <RecipientsInput
          value={form.escalationRecipients}
          onChange={(escalationRecipients) => setForm({ ...form, escalationRecipients })}
          label="Escalation recipients"
          placeholder="manager@example.com"
        />
      </div>

      {/* ── Checks ───────────────────────────────── */}
      {(form.type === "HTTP" || form.type === "TCP") && (
        <SectionHeader title="Checks" />
      )}

      {!isDomain && !isTcp && !isHeartbeat && !isWordPress && (
        <div className="flex items-center justify-between py-3 border border-gray-200 dark:border-gray-700 rounded-lg px-4">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">SSL monitoring</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Alert when certificate expires or becomes invalid</p>
          </div>
          <button
            type="button"
            onClick={() => setForm({ ...form, sslEnabled: !form.sslEnabled })}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
              form.sslEnabled ? "bg-emerald-500" : "bg-gray-200"
            }`}
            role="switch"
            aria-checked={form.sslEnabled}
          >
            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
              form.sslEnabled ? "translate-x-4" : "translate-x-0"
            }`} />
          </button>
        </div>
      )}

      {(form.type === "HTTP" || form.type === "TCP") && !isWordPress && (
        <div className="flex items-center justify-between py-3 border border-gray-200 dark:border-gray-700 rounded-lg px-4 gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Response time alert</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Alert when response time exceeds this. Leave blank to disable.</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <input
              type="number"
              min={1}
              max={60000}
              placeholder="e.g. 2000"
              value={form.responseTimeThreshold}
              onChange={(e) => setForm({ ...form, responseTimeThreshold: e.target.value })}
              className="w-24 border border-gray-300 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-right bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">ms</span>
          </div>
        </div>
      )}

      {!isDomain && !isTcp && !isHeartbeat && !isWordPress && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Keyword check <span className="text-gray-400 font-normal">(optional)</span></label>
          <input
            type="text"
            placeholder="e.g. Welcome to my site"
            value={form.keywordExpected}
            onChange={(e) => setForm({ ...form, keywordExpected: e.target.value })}
            className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500">Alert if this text disappears from the page response — useful for detecting broken deployments or defacement.</p>
        </div>
      )}

      {!isDomain && !isTcp && !isHeartbeat && !isWordPress && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col gap-3">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">JSON response assertion <span className="text-gray-400 font-normal">(optional)</span></p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Alert if a JSON field in the response doesn&apos;t match the expected value. Useful for API health check endpoints.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">JSON path</label>
              <input
                type="text"
                placeholder="e.g. status or data.health"
                value={form.jsonAssertPath}
                onChange={(e) => setForm({ ...form, jsonAssertPath: e.target.value })}
                className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Expected value</label>
              <input
                type="text"
                placeholder='e.g. ok or true'
                value={form.jsonAssertExpected}
                onChange={(e) => setForm({ ...form, jsonAssertExpected: e.target.value })}
                className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {loading ? "Saving..." : isEditing ? "Save changes" : "Start monitoring"}
        </button>
        {isEditing && (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={loading}
            className="text-red-500 hover:text-red-600 text-sm font-medium"
          >
            Delete monitor
          </button>
        )}
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="Delete monitor"
        description="This will permanently delete the monitor and all its check history. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => { setConfirmOpen(false); handleDelete(); }}
        onCancel={() => setConfirmOpen(false)}
      />
    </form>
  );
}
