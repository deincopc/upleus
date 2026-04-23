"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface ProjectFormProps {
  defaultValues?: {
    id?: string;
    name?: string;
    statusDescription?: string | null;
    statusBannerMessage?: string | null;
    statusHideBranding?: boolean;
  };
}

export function ProjectForm({ defaultValues }: ProjectFormProps) {
  const router = useRouter();
  const isEditing = !!defaultValues?.id;

  const [name, setName] = useState(defaultValues?.name ?? "");
  const [statusDescription, setStatusDescription] = useState(defaultValues?.statusDescription ?? "");
  const [statusBannerMessage, setStatusBannerMessage] = useState(defaultValues?.statusBannerMessage ?? "");
  const [statusHideBranding, setStatusHideBranding] = useState(defaultValues?.statusHideBranding ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        isEditing ? `/api/projects/${defaultValues!.id}` : "/api/projects",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            ...(isEditing && {
              statusDescription,
              statusBannerMessage,
              statusHideBranding,
            }),
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Something went wrong");
      }

      const project = await res.json();
      router.push(`/dashboard/projects/${project.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    await fetch(`/api/projects/${defaultValues!.id}`, { method: "DELETE" });
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Project name</label>
        <input
          type="text"
          required
          placeholder="Acme Corp"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      {/* Status page customization — only shown when editing */}
      {isEditing && (
        <>
          <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">Status page</p>

            <div className="flex flex-col gap-5">
              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Real-time status for all Acme services"
                  value={statusDescription}
                  onChange={(e) => setStatusDescription(e.target.value)}
                  maxLength={200}
                  className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 dark:text-gray-500">Shown as a subtitle under your project name on the public page.</p>
              </div>

              {/* Maintenance banner */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Maintenance notice <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Scheduled maintenance tonight 2–4am UTC. Expect brief downtime."
                  value={statusBannerMessage}
                  onChange={(e) => setStatusBannerMessage(e.target.value)}
                  maxLength={500}
                  className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-400 dark:text-gray-500">Pinned yellow banner at the top of the status page. Clear it when done.</p>
              </div>

              {/* Hide branding */}
              <div className="flex items-center justify-between py-3 border border-gray-200 dark:border-gray-700 rounded-lg px-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Hide "Powered by Upleus"</p>
                  <p className="text-xs text-gray-400 mt-0.5">Remove the Upleus branding from the footer</p>
                </div>
                <button
                  type="button"
                  onClick={() => setStatusHideBranding(!statusHideBranding)}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                    statusHideBranding ? "bg-emerald-500" : "bg-gray-200"
                  }`}
                  role="switch"
                  aria-checked={statusHideBranding}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                    statusHideBranding ? "translate-x-4" : "translate-x-0"
                  }`} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {loading ? "Saving..." : isEditing ? "Save changes" : "Create project"}
        </button>
        {isEditing && (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={loading}
            className="text-red-500 hover:text-red-600 text-sm font-medium"
          >
            Delete project
          </button>
        )}
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="Delete project"
        description="Monitors inside this project will be unassigned but not deleted. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => { setConfirmOpen(false); handleDelete(); }}
        onCancel={() => setConfirmOpen(false)}
      />
    </form>
  );
}
