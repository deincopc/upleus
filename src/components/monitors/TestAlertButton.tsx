"use client";

import { useState } from "react";

type State = "idle" | "loading" | "sent" | "error";

export function TestAlertButton({ monitorId }: { monitorId: string }) {
  const [state, setState] = useState<State>("idle");

  async function send() {
    setState("loading");
    try {
      const res = await fetch(`/api/monitors/${monitorId}/test-alert`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      setState("sent");
      setTimeout(() => setState("idle"), 3000);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  }

  if (state === "sent") {
    return (
      <span className="text-xs font-medium text-emerald-600 flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        Test sent
      </span>
    );
  }

  if (state === "error") {
    return (
      <span className="text-xs font-medium text-red-500">Failed to send</span>
    );
  }

  return (
    <button
      onClick={send}
      disabled={state === "loading"}
      className="text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
    >
      {state === "loading" ? "Sending…" : "Send test alert"}
    </button>
  );
}
