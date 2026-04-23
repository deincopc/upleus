"use client";

import { useState, KeyboardEvent } from "react";

interface RecipientsInputProps {
  value: string[];
  onChange: (emails: string[]) => void;
  ownerEmail?: string;
  label?: string;
  placeholder?: string;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function RecipientsInput({ value, onChange, ownerEmail, label = "Alert recipients", placeholder = "client@example.com" }: RecipientsInputProps) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  function add() {
    const email = input.trim().toLowerCase();
    if (!email) return;
    if (!isValidEmail(email)) { setError("Invalid email address"); return; }
    if (email === ownerEmail?.toLowerCase()) { setError("Account email is always notified"); setInput(""); return; }
    if (value.includes(email)) { setError("Already added"); return; }
    onChange([...value, email]);
    setInput("");
    setError(null);
  }

  function remove(email: string) {
    onChange(value.filter((e) => e !== email));
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); }
    if (e.key === "Backspace" && !input && value.length > 0) {
      remove(value[value.length - 1]);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>

      {/* Owner email tag */}
      {ownerEmail && (
        <div className="flex flex-wrap gap-2 mb-1">
          <span className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs px-2.5 py-1 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {ownerEmail}
            <span className="text-emerald-400 ml-0.5">you</span>
          </span>
        </div>
      )}

      {/* Added recipients */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-1">
          {value.map((email) => (
            <span
              key={email}
              className="inline-flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs px-2.5 py-1 rounded-full"
            >
              {email}
              <button
                type="button"
                onClick={() => remove(email)}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors ml-0.5"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="email"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(null); }}
          onKeyDown={handleKey}
          onBlur={add}
          placeholder={placeholder}
          className="flex-1 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
        <button
          type="button"
          onClick={add}
          className="text-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Add
        </button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      <p className="text-xs text-gray-400 dark:text-gray-500">
        Press Enter or comma to add. Account email is always notified.
      </p>
    </div>
  );
}
