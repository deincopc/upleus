"use client";

import { useState } from "react";

const TABS = [
  {
    label: "cURL",
    lang: "bash",
    lines: [
      { type: "comment", text: "# Paste at the end of any cron job or script" },
      { type: "plain",   text: "" },
      { type: "command", text: 'curl -fsSL https://upleus.com/api/heartbeat/', token: true },
    ],
  },
  {
    label: "Python",
    lang: "python",
    lines: [
      { type: "comment", text: "# Paste at the end of any script" },
      { type: "plain",   text: "" },
      { type: "keyword", text: "import ", rest: "requests" },
      { type: "fn",      text: "requests.get(", str: '"https://upleus.com/api/heartbeat/', token: true, close: '")' },
    ],
  },
  {
    label: "Node.js",
    lang: "javascript",
    lines: [
      { type: "comment", text: "// Paste at the end of any async function or job" },
      { type: "plain",   text: "" },
      { type: "keyword", text: "await ", rest: 'fetch(', str: '"https://upleus.com/api/heartbeat/', token: true, close: '");' },
    ],
  },
  {
    label: "Ruby",
    lang: "ruby",
    lines: [
      { type: "comment", text: "# Paste at the end of any script" },
      { type: "plain",   text: "" },
      { type: "keyword", text: "require ", str: '"net/http"' },
      { type: "fn",      text: "Net::HTTP.get(URI(", str: '"https://upleus.com/api/heartbeat/', token: true, close: '"))' },
    ],
  },
] as const;

type Tab = typeof TABS[number];

function renderLine(line: Tab["lines"][number], i: number) {
  if (line.type === "comment") {
    return <div key={i} className="text-gray-500">{line.text}</div>;
  }
  if (line.type === "plain") {
    return <div key={i}>&nbsp;</div>;
  }
  if (line.type === "keyword" && "rest" in line) {
    return (
      <div key={i}>
        <span className="text-violet-400">{line.text}</span>
        <span className="text-gray-200">{line.rest}</span>
        {"str" in line && <span className="text-emerald-400">{(line as { str: string }).str}</span>}
        {"token" in line && <span className="text-amber-300 font-semibold">YOUR_TOKEN</span>}
        {"close" in line && <span className="text-gray-200">{(line as { close: string }).close}</span>}
      </div>
    );
  }
  if (line.type === "keyword" && "str" in line) {
    return (
      <div key={i}>
        <span className="text-violet-400">{line.text}</span>
        <span className="text-emerald-400">{(line as {str: string}).str}</span>
        {"token" in line && <span className="text-amber-300 font-semibold">YOUR_TOKEN</span>}
        {"close" in line && <span className="text-gray-200">{(line as {close: string}).close}</span>}
      </div>
    );
  }
  if (line.type === "command") {
    return (
      <div key={i}>
        <span className="text-emerald-400">{line.text}</span>
        {"token" in line && <span className="text-amber-300 font-semibold">YOUR_TOKEN</span>}
      </div>
    );
  }
  if (line.type === "fn") {
    return (
      <div key={i}>
        <span className="text-sky-400">{(line as {text: string}).text}</span>
        {"str" in line && <span className="text-emerald-400">{(line as {str: string}).str}</span>}
        {"token" in line && <span className="text-amber-300 font-semibold">YOUR_TOKEN</span>}
        {"close" in line && <span className="text-gray-200">{(line as {close: string}).close}</span>}
      </div>
    );
  }
  return <div key={i} className="text-gray-200">{(line as {text: string}).text}</div>;
}

export function CodeTabs() {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const tab = TABS[active];

  function getCode(t: Tab): string {
    if (t.label === "cURL")   return "curl -fsSL https://upleus.com/api/heartbeat/YOUR_TOKEN";
    if (t.label === "Python") return 'import requests\nrequests.get("https://upleus.com/api/heartbeat/YOUR_TOKEN")';
    if (t.label === "Node.js") return 'await fetch("https://upleus.com/api/heartbeat/YOUR_TOKEN");';
    return 'require "net/http"\nNet::HTTP.get(URI("https://upleus.com/api/heartbeat/YOUR_TOKEN"))';
  }

  function copy() {
    navigator.clipboard.writeText(getCode(tab));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-0 bg-gray-900 rounded-t-xl px-4 pt-3 border border-gray-800 border-b-0">
        {TABS.map((t, i) => (
          <button
            key={t.label}
            onClick={() => setActive(i)}
            className={`px-3 py-1.5 text-xs font-medium rounded-t-lg transition-colors ${
              i === active
                ? "bg-gray-800 text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Code block */}
      <div className="relative bg-gray-900 border border-gray-800 rounded-b-xl rounded-tr-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/50" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
            <div className="w-3 h-3 rounded-full bg-green-500/50" />
          </div>
          <button
            onClick={copy}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1.5"
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>
        <pre className="px-5 py-5 text-sm font-mono leading-relaxed overflow-x-auto">
          {tab.lines.map((line, i) => renderLine(line as Tab["lines"][number], i))}
        </pre>
      </div>
    </div>
  );
}
