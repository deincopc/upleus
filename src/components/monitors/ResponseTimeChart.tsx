"use client";

import { useEffect, useState } from "react";

type Range = "24h" | "7d" | "30d";

interface DataPoint {
  time: string;
  value: number | null;
}

function formatLabel(iso: string, range: Range): string {
  const d = new Date(iso);
  if (range === "24h") return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function ResponseTimeChart({ monitorId }: { monitorId: string }) {
  const [range, setRange] = useState<Range>("24h");
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/monitors/${monitorId}/response-times?range=${range}`)
      .then((r) => r.json())
      .then((res) => { setData(res.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [monitorId, range]);

  const points = data.filter((d) => d.value !== null) as { time: string; value: number }[];
  const hasData = points.length >= 2;
  const values = points.map((p) => p.value);
  const maxT = hasData ? Math.max(...values) : 1;
  const minT = hasData ? Math.min(...values) : 0;
  const avg = hasData ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;

  const W = 600;
  const H = 80;
  const P = 3;
  const xPos = (i: number) => P + (i / (points.length - 1)) * (W - P * 2);
  const yPos = (v: number) =>
    maxT === minT ? H / 2 : P + ((maxT - v) / (maxT - minT)) * (H - P * 2);

  const linePts = points.map((p, i) => `${xPos(i)},${yPos(p.value)}`).join(" ");
  const area = hasData ? [
    `M ${xPos(0)},${H}`,
    ...points.map((p, i) => `L ${xPos(i)},${yPos(p.value)}`),
    `L ${xPos(points.length - 1)},${H}`,
    "Z",
  ].join(" ") : "";

  const firstLabel = points.length > 0 ? formatLabel(points[0].time, range) : "";
  const lastLabel = points.length > 0 ? formatLabel(points[points.length - 1].time, range) : "";

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Response time</span>
          {hasData && !loading && (
            <div className="flex gap-3 text-xs text-gray-400 dark:text-gray-500">
              <span>min <span className="font-semibold text-gray-700 dark:text-gray-300">{minT}ms</span></span>
              <span>avg <span className="font-semibold text-gray-700 dark:text-gray-300">{avg}ms</span></span>
              <span>max <span className="font-semibold text-gray-700 dark:text-gray-300">{maxT}ms</span></span>
            </div>
          )}
        </div>
        <div className="flex gap-1">
          {(["24h", "7d", "30d"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                range === r
                  ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900"
                  : "text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-20 flex items-center justify-center">
          <span className="text-xs text-gray-300 dark:text-gray-600">Loading…</span>
        </div>
      ) : !hasData ? (
        <div className="h-20 flex items-center justify-center">
          <span className="text-xs text-gray-300 dark:text-gray-600">No data for this period</span>
        </div>
      ) : (
        <>
          <div className="rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 px-1 py-2">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20" preserveAspectRatio="none">
              <defs>
                <linearGradient id="rtc-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <path d={area} fill="url(#rtc-fill)" />
              <polyline
                points={linePts}
                fill="none"
                stroke="#10b981"
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              {points.map((p, i) => (
                i % Math.ceil(points.length / 40) === 0 || i === points.length - 1 ? (
                  <circle
                    key={i}
                    cx={xPos(i)}
                    cy={yPos(p.value)}
                    r="2.5"
                    fill="#10b981"
                    vectorEffect="non-scaling-stroke"
                  >
                    <title>{`${formatLabel(p.time, range)} — ${p.value}ms`}</title>
                  </circle>
                ) : null
              ))}
            </svg>
          </div>
          <div className="flex justify-between text-xs text-gray-300 dark:text-gray-600 mt-1 px-1">
            <span>{firstLabel}</span>
            <span>{lastLabel}</span>
          </div>
        </>
      )}
    </div>
  );
}
