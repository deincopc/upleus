"use client";

import Link from "next/link";
import { PauseButton } from "./PauseButton";
import { UptimeBar } from "./UptimeBar";

type Check = {
  isUp: boolean;
  responseTime: number | null;
  checkedAt: Date | string;
};

type MonitorWithChecks = {
  id: string;
  type: string;
  name: string;
  url: string | null;
  port: number | null;
  isUp: boolean;
  isActive: boolean;
  lastCheckedAt: Date | null;
  sslEnabled: boolean;
  sslValid: boolean | null;
  sslDaysUntilExpiry: number | null;
  domainExpiresAt: Date | null;
  domainDaysUntilExpiry: number | null;
  wpVersion: string | null;
  wpVersionStatus: string | null;
  wpSecurityChecks: unknown;
  wpScannedAt: Date | null;
  shopifyScannedAt: Date | null;
  checks: Check[];
};

function formatExpiry(date: Date | null, days: number | null): string {
  if (!date) return "—";
  const d = new Date(date);
  const month = d.toLocaleString("en-GB", { month: "short" });
  const label = `${d.getDate()} ${month} ${d.getFullYear()}`;
  if (days !== null && days <= 30) return `${label} (${days}d)`;
  return label;
}

function uptimePercent(checks: Check[]): string {
  if (checks.length === 0) return "—";
  const up = checks.filter((c) => c.isUp).length;
  return ((up / checks.length) * 100).toFixed(1) + "%";
}

function avgResponseTime(checks: Check[]): string {
  const withTime = checks.filter((c) => c.responseTime !== null);
  if (withTime.length === 0) return "—";
  const avg = withTime.reduce((s, c) => s + c.responseTime!, 0) / withTime.length;
  return Math.round(avg) + "ms";
}

function timeAgo(date: Date | null): string {
  if (!date) return "Never";
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

function SslBadge({ valid, days }: { valid: boolean | null; days: number | null }) {
  if (!valid) return (
    <span className="hidden lg:inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400">SSL invalid</span>
  );
  if (days !== null && days <= 7) return (
    <span className="hidden lg:inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">SSL {days}d</span>
  );
  if (days !== null && days <= 30) return (
    <span className="hidden lg:inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">SSL {days}d</span>
  );
  return null;
}

export function MonitorCard({ monitor }: { monitor: MonitorWithChecks }) {
  const { isUp, isActive } = monitor;
  const isDomain = monitor.type === "DOMAIN";
  const isTcp = monitor.type === "TCP";

  const isHeartbeat = monitor.type === "HEARTBEAT";
  const isWordPress = monitor.type === "WORDPRESS";
  const hasWpData = !!(monitor.wpVersion ?? monitor.wpVersionStatus ?? monitor.wpScannedAt);
  const isShopify = !!monitor.shopifyScannedAt;
  const typeBadge = isTcp ? "TCP" : isDomain ? "Domain" : isHeartbeat ? "Heartbeat" : isWordPress ? "WordPress" : null;
  const statusLabel = !isActive ? "Paused" : isDomain ? (isUp ? "Active" : "Expired") : isHeartbeat ? (isUp ? "Up" : "Missed") : (isUp ? "Up" : "Down");

  const wpSecurityIssueCount = (isWordPress || hasWpData) && monitor.wpSecurityChecks && typeof monitor.wpSecurityChecks === "object"
    ? Object.values(monitor.wpSecurityChecks as Record<string, boolean | string | null>).filter((v) => v === true).length
    : 0;
  const statusColor = !isActive
    ? "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
    : isUp
    ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
    : "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400";

  return (
    <div className={`bg-white dark:bg-gray-900 border rounded-2xl px-5 pt-4 pb-3 transition-all hover:shadow-sm ${
      !isActive ? "opacity-60 border-gray-200 dark:border-gray-800" : isUp ? "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700" : "border-red-200 dark:border-red-900 bg-red-50/30 dark:bg-red-900/10"
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
            !isActive ? "bg-gray-300" : isUp ? "bg-emerald-500" : "bg-red-500"
          }`} />
          <div>
            <div className="flex items-center gap-2">
              <Link
                href={`/dashboard/monitors/${monitor.id}`}
                className="font-semibold text-gray-900 dark:text-gray-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-sm"
              >
                {monitor.name}
              </Link>
              {typeBadge && (
                <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">{typeBadge}</span>
              )}
              {!isWordPress && hasWpData && (
                <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">WordPress</span>
              )}
              {isShopify && (
                <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400">Shopify</span>
              )}
            </div>
            {!isHeartbeat && !isWordPress && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-mono">
                {isTcp && monitor.port ? `${monitor.url}:${monitor.port}` : monitor.url ?? ""}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          {(isWordPress || hasWpData) ? (
            <>
              <div className="text-right hidden sm:block">
                <p className="text-gray-400 dark:text-gray-500 text-xs">WP version</p>
                <p className={`font-semibold text-sm ${
                  monitor.wpVersionStatus === "outdated_major" ? "text-red-600 dark:text-red-400" :
                  monitor.wpVersionStatus === "outdated_minor" ? "text-amber-600 dark:text-amber-400" :
                  "text-gray-900 dark:text-gray-100"
                }`}>
                  {monitor.wpVersion ?? "—"}
                </p>
              </div>
              {wpSecurityIssueCount > 0 && (
                <span className="hidden lg:inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                  {wpSecurityIssueCount} issue{wpSecurityIssueCount !== 1 ? "s" : ""}
                </span>
              )}
              {monitor.wpVersionStatus === "outdated_major" && (
                <span className="hidden lg:inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                  Major update
                </span>
              )}
              {monitor.wpVersionStatus === "outdated_minor" && (
                <span className="hidden lg:inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                  Update available
                </span>
              )}
            </>
          ) : isHeartbeat ? (
            <>
              <div className="text-right hidden sm:block">
                <p className="text-gray-400 dark:text-gray-500 text-xs">Last ping</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{timeAgo(monitor.lastCheckedAt)}</p>
              </div>
              <div className="text-right hidden md:block">
                <p className="text-gray-400 dark:text-gray-500 text-xs">Uptime</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{uptimePercent(monitor.checks)}</p>
              </div>
            </>
          ) : isDomain ? (

            <>
              <div className="text-right hidden sm:block">
                <p className="text-gray-400 dark:text-gray-500 text-xs">Renews</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{formatExpiry(monitor.domainExpiresAt, monitor.domainDaysUntilExpiry)}</p>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-gray-400 dark:text-gray-500 text-xs">Last check</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{timeAgo(monitor.lastCheckedAt)}</p>
              </div>
            </>
          ) : (
            <>
              <div className="text-right hidden md:block">
                <p className="text-gray-400 dark:text-gray-500 text-xs">Uptime</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{uptimePercent(monitor.checks)}</p>
              </div>
              <div className="text-right hidden md:block">
                <p className="text-gray-400 dark:text-gray-500 text-xs">{isTcp ? "Connect" : "Response"}</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{avgResponseTime(monitor.checks)}</p>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-gray-400 dark:text-gray-500 text-xs">Last check</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{timeAgo(monitor.lastCheckedAt)}</p>
              </div>
              {!isTcp && monitor.domainDaysUntilExpiry !== null && monitor.domainDaysUntilExpiry <= 30 && (
                <span className={`hidden lg:inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                  monitor.domainDaysUntilExpiry <= 7 ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400" : "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                }`}>
                  Domain {monitor.domainDaysUntilExpiry}d
                </span>
              )}
              {!isTcp && monitor.sslEnabled && monitor.sslValid !== null && (
                <SslBadge valid={monitor.sslValid} days={monitor.sslDaysUntilExpiry} />
              )}
            </>
          )}

          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
            {statusLabel}
          </span>

          <PauseButton monitorId={monitor.id} isActive={isActive} />
        </div>
      </div>

      <UptimeBar checks={monitor.checks} />
    </div>
  );
}
