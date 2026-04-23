import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MonitorForm } from "@/components/monitors/MonitorForm";
import { MonitorMaintenanceSection } from "@/components/monitors/MonitorMaintenanceSection";
import { ChecksLog } from "@/components/monitors/ChecksLog";
import { IncidentHistory } from "@/components/monitors/IncidentHistory";
import { ResponseTimeChart } from "@/components/monitors/ResponseTimeChart";
import { PauseButton } from "@/components/monitors/PauseButton";
import { TestAlertButton } from "@/components/monitors/TestAlertButton";
import { RescanButton } from "@/components/monitors/RescanButton";
import type { WpPlugin, WpTheme } from "@/lib/checks/wordpress";

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

type Tab = "overview" | "insights" | "incidents" | "settings";

function TabBar({
  monitorId,
  active,
  showInsights,
  insightsBadge,
  incidentCount,
}: {
  monitorId: string;
  active: Tab;
  showInsights: boolean;
  insightsBadge: number;
  incidentCount: number;
}) {
  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: "overview", label: "Overview" },
    ...(showInsights ? [{ id: "insights" as Tab, label: "Insights", badge: insightsBadge || undefined }] : []),
    { id: "incidents", label: "Incidents", badge: incidentCount || undefined },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div className="overflow-x-auto -mx-6 px-6 border-b border-gray-200 dark:border-gray-800 mb-8">
      <div className="flex gap-1 min-w-max">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={`/dashboard/monitors/${monitorId}${tab.id === "overview" ? "" : `?tab=${tab.id}`}`}
          className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            active === tab.id
              ? "border-gray-900 dark:border-gray-100 text-gray-900 dark:text-gray-100"
              : "border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          {tab.label}
          {tab.badge ? (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
              active === tab.id
                ? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
            }`}>
              {tab.badge}
            </span>
          ) : null}
        </Link>
      ))}
      </div>
    </div>
  );
}

export default async function MonitorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { userId } = await auth();
  const { id } = await params;
  const { tab: tabParam } = await searchParams;

  const user = await prisma.user.findUnique({ where: { clerkId: userId! } });
  if (!user) notFound();

  const now = new Date();

  const [monitor, activeWindow, upcomingWindow] = await Promise.all([
    prisma.monitor.findFirst({
      where: { id, userId: user.id },
      include: {
        checks: { orderBy: { checkedAt: "desc" }, take: 50 },
        alerts: { orderBy: { sentAt: "desc" }, take: 50 },
      },
    }),
    prisma.maintenanceWindow.findFirst({
      where: { monitorId: id, startsAt: { lte: now }, endsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
    }),
    prisma.maintenanceWindow.findFirst({
      where: { monitorId: id, startsAt: { gt: now, lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) } },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  if (!monitor) notFound();

  type MonitorCheck = (typeof monitor.checks)[number];
  type MonitorAlert = (typeof monitor.alerts)[number];

  const isDomain = monitor.type === "DOMAIN";
  const isTcp = monitor.type === "TCP";
  const isHeartbeat = monitor.type === "HEARTBEAT";
  const isWordPress = monitor.type === "WORDPRESS";
  const hasWpData = !!(monitor.wpScannedAt ?? monitor.wpVersion);
  const hasShopifyData = !!(monitor.shopifyScannedAt && monitor.shopifyChecks);
  const showInsights = !isDomain && !isTcp && !isHeartbeat;

  const upChecks = monitor.checks.filter((c: MonitorCheck) => c.isUp).length;
  const uptimePct =
    monitor.checks.length > 0
      ? ((upChecks / monitor.checks.length) * 100).toFixed(1)
      : null;

  const wpSecurityChecks = monitor.wpSecurityChecks as Record<string, boolean | string | null> | null;
  const shopifyChecks = monitor.shopifyChecks as {
    passwordModeEnabled: boolean;
    maintenanceModeEnabled: boolean;
    cartApiUp: boolean | null;
    gaPresent: boolean;
    metaPixelPresent: boolean;
    tiktokPixelPresent: boolean;
    klaviyoPresent: boolean;
    cookieConsentPresent: boolean;
    reviewsApp: string | null;
    liveChat: string | null;
    themeName: string | null;
  } | null;
  const dnsIps = Array.isArray(monitor.dnsIps) ? (monitor.dnsIps as string[]) : null;
  const httpSecurityChecks = monitor.httpSecurityChecks as Record<string, boolean | string | null> | null;

  const httpSecurityIssueCount = httpSecurityChecks
    ? Object.entries(httpSecurityChecks).filter(([k, v]) => k !== "detectedServerHeader" && v === true).length
    : 0;
  const wpSecurityIssueCount = wpSecurityChecks
    ? Object.values(wpSecurityChecks).filter((v) => v === true).length
    : 0;
  const wpPluginList = Array.isArray(monitor.wpPlugins) ? (monitor.wpPlugins as unknown as WpPlugin[]) : [];
  const wpRiskyPluginCount = wpPluginList.filter(
    (p) => p.status === "removed" || p.status === "abandoned" || p.status === "outdated"
  ).length;
  const wpThemeList = Array.isArray(monitor.wpThemes) ? (monitor.wpThemes as unknown as WpTheme[]) : [];

  const insightsBadge = httpSecurityIssueCount + wpSecurityIssueCount + wpRiskyPluginCount +
    (shopifyChecks?.passwordModeEnabled ? 1 : 0);

  const avgResponse =
    !isDomain && monitor.checks.filter((c: MonitorCheck) => c.responseTime).length > 0
      ? Math.round(
          monitor.checks.filter((c: MonitorCheck) => c.responseTime).reduce((s: number, c: MonitorCheck) => s + c.responseTime!, 0) /
          monitor.checks.filter((c: MonitorCheck) => c.responseTime).length
        )
      : null;

  const incidentCount = monitor.alerts.filter((a: MonitorAlert) => a.type === "DOWN").length;

  const validTabs: Tab[] = ["overview", "insights", "incidents", "settings"];
  const activeTab: Tab = validTabs.includes(tabParam as Tab) ? (tabParam as Tab) : "overview";

  // ── Shared header ─────────────────────────────────────────────────────────────

  const header = (
    <div className="mb-6">
      <Link href="/dashboard" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
        ← Back to monitors
      </Link>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mt-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
              !monitor.isActive ? "bg-gray-300" : monitor.isUp ? "bg-emerald-500" : "bg-red-500"
            }`} />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{monitor.name}</h1>
            {isDomain && <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500">Domain</span>}
            {isTcp && <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500">TCP</span>}
            {isHeartbeat && <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500">Heartbeat</span>}
            {isWordPress && <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">WordPress</span>}
            {hasShopifyData && <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400">Shopify</span>}
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
              !monitor.isActive
                ? "bg-gray-100 dark:bg-gray-800 text-gray-500"
                : monitor.isUp
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }`}>
              {!monitor.isActive ? "Paused" : isDomain ? (monitor.isUp ? "Active" : "Expired") : isHeartbeat ? (monitor.isUp ? "Up" : "Missed") : (monitor.isUp ? "Up" : "Down")}
            </span>
          </div>
          {!isHeartbeat && !isWordPress && monitor.url && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-mono ml-6">
              {isTcp && monitor.port ? `${monitor.url}:${monitor.port}` : monitor.url}
            </p>
          )}
          {isWordPress && monitor.url && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-mono ml-6">{monitor.url}</p>
          )}
        </div>
        <div className="flex items-center gap-2 sm:flex-shrink-0">
          {(isWordPress || hasWpData) && <RescanButton monitorId={monitor.id} />}
          <TestAlertButton monitorId={monitor.id} />
          <PauseButton monitorId={monitor.id} isActive={monitor.isActive} />
        </div>
      </div>
    </div>
  );

  // ── Stats cards ───────────────────────────────────────────────────────────────

  const statCard = (label: string, value: string, sub?: string, color?: string) => (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
      <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color ?? "text-gray-900 dark:text-gray-100"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );

  const statsGrid = (
    <div className={`grid gap-4 mb-8 ${
      isWordPress ? "grid-cols-2 sm:grid-cols-3"
      : isDomain || isHeartbeat ? "grid-cols-2"
      : isTcp ? "grid-cols-2 sm:grid-cols-3"
      : monitor.domainDaysUntilExpiry !== null ? "grid-cols-2 sm:grid-cols-4"
      : "grid-cols-2 sm:grid-cols-3"
    }`}>
      {isWordPress ? (
        <>
          {statCard("WP version", monitor.wpVersion ?? "—", monitor.wpLatestVersion && monitor.wpVersionStatus !== "current" ? `Latest: ${monitor.wpLatestVersion}` : undefined,
            monitor.wpVersionStatus === "outdated_major" ? "text-red-600" : monitor.wpVersionStatus === "outdated_minor" ? "text-amber-600" : undefined)}
          {statCard("Issues", monitor.wpScannedAt ? String(wpSecurityIssueCount + wpRiskyPluginCount) : "—",
            wpSecurityIssueCount + wpRiskyPluginCount > 0 ? [wpSecurityIssueCount > 0 ? `${wpSecurityIssueCount} config` : "", wpRiskyPluginCount > 0 ? `${wpRiskyPluginCount} plugin${wpRiskyPluginCount !== 1 ? "s" : ""}` : ""].filter(Boolean).join(", ") : undefined,
            wpSecurityIssueCount + wpRiskyPluginCount > 0 ? "text-amber-600" : undefined)}
          {statCard("Last scanned", monitor.wpScannedAt ? timeAgo(monitor.wpScannedAt) : "—")}
        </>
      ) : isHeartbeat ? (
        <>
          {statCard("Uptime", uptimePct ? `${uptimePct}%` : "—")}
          {statCard("Last ping", monitor.lastCheckedAt ? timeAgo(monitor.lastCheckedAt) : "Never")}
        </>
      ) : isDomain ? (
        <>
          {statCard("Days until expiry", monitor.domainDaysUntilExpiry !== null ? String(monitor.domainDaysUntilExpiry) : "—",
            monitor.domainExpiresAt ? formatDate(monitor.domainExpiresAt) : undefined,
            monitor.domainDaysUntilExpiry !== null && monitor.domainDaysUntilExpiry <= 7 ? "text-red-600" : monitor.domainDaysUntilExpiry !== null && monitor.domainDaysUntilExpiry <= 30 ? "text-amber-600" : undefined)}
          {statCard("Last checked", monitor.lastCheckedAt ? timeAgo(monitor.lastCheckedAt) : "—")}
        </>
      ) : isTcp ? (
        <>
          {statCard("Uptime", uptimePct ? `${uptimePct}%` : "—")}
          {statCard("Avg connect", avgResponse ? `${avgResponse}ms` : "—")}
          {statCard("Last check", monitor.lastCheckedAt ? timeAgo(monitor.lastCheckedAt) : "—")}
        </>
      ) : (
        <>
          {statCard("Uptime", uptimePct ? `${uptimePct}%` : "—")}
          {statCard("Avg response", avgResponse ? `${avgResponse}ms` : "—")}
          {statCard("Last check", monitor.lastCheckedAt ? timeAgo(monitor.lastCheckedAt) : "—")}
          {monitor.domainDaysUntilExpiry !== null && statCard("Domain expires",
            `${monitor.domainDaysUntilExpiry}d`,
            monitor.domainExpiresAt ? formatDate(monitor.domainExpiresAt) : undefined,
            monitor.domainDaysUntilExpiry <= 7 ? "text-red-600" : monitor.domainDaysUntilExpiry <= 30 ? "text-amber-600" : undefined)}
        </>
      )}
    </div>
  );

  // ── Alert banners ─────────────────────────────────────────────────────────────

  function fmtDt(d: Date) {
    return d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" });
  }

  const alertBanners = (
    <div className="space-y-3 mb-8">
      {activeWindow && (
        <div className="px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm flex items-start gap-3">
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div>
            <p className="font-medium">Maintenance window active — alerts suppressed</p>
            <p className="text-xs opacity-75 mt-0.5">{activeWindow.name} · ends {fmtDt(activeWindow.endsAt)}</p>
          </div>
        </div>
      )}
      {!activeWindow && upcomingWindow && (
        <div className="px-4 py-3 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 text-sm flex items-start gap-3">
          <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <div>
            <p className="font-medium">Maintenance scheduled in the next 24 hours</p>
            <p className="text-xs opacity-75 mt-0.5">{upcomingWindow.name} · {fmtDt(upcomingWindow.startsAt)} → {fmtDt(upcomingWindow.endsAt)}</p>
          </div>
        </div>
      )}
      {isHeartbeat && monitor.heartbeatToken && (
        <div className="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-sm">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Ping URL — call this at the end of each job run</p>
          <code className="block text-xs font-mono text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 truncate">
            {process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/heartbeat/{monitor.heartbeatToken}
          </code>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">Accepts GET or POST. The URL is your secret.</p>
        </div>
      )}

      {!isTcp && !isHeartbeat && !isWordPress && monitor.domainDaysUntilExpiry !== null && (
        <div className={`px-4 py-3 rounded-xl border text-sm ${
          !monitor.isUp ? "bg-red-50 border-red-200 text-red-700"
          : monitor.domainDaysUntilExpiry <= 7 ? "bg-amber-50 border-amber-200 text-amber-700"
          : monitor.domainDaysUntilExpiry <= 30 ? "bg-yellow-50 border-yellow-200 text-yellow-700"
          : "bg-emerald-50 border-emerald-200 text-emerald-700"
        }`}>
          <p className="font-medium">
            {!monitor.isUp ? "Domain has expired or is unavailable"
            : monitor.domainDaysUntilExpiry <= 30 ? `Domain expires in ${monitor.domainDaysUntilExpiry} day${monitor.domainDaysUntilExpiry === 1 ? "" : "s"}`
            : "Domain registration is active"}
          </p>
          {monitor.domainExpiresAt && <p className="text-xs opacity-70 mt-0.5">Renewal due {formatDate(monitor.domainExpiresAt)}</p>}
        </div>
      )}

      {!isDomain && !isTcp && !isHeartbeat && !isWordPress && monitor.sslEnabled && monitor.sslValid !== null && (
        <div className={`px-4 py-3 rounded-xl border text-sm ${
          !monitor.sslValid ? "bg-red-50 border-red-200 text-red-700"
          : monitor.sslDaysUntilExpiry !== null && monitor.sslDaysUntilExpiry <= 7 ? "bg-amber-50 border-amber-200 text-amber-700"
          : monitor.sslDaysUntilExpiry !== null && monitor.sslDaysUntilExpiry <= 30 ? "bg-yellow-50 border-yellow-200 text-yellow-700"
          : "bg-emerald-50 border-emerald-200 text-emerald-700"
        }`}>
          <p className="font-medium">
            {!monitor.sslValid ? "SSL certificate invalid"
            : monitor.sslDaysUntilExpiry !== null && monitor.sslDaysUntilExpiry <= 30 ? `SSL certificate expires in ${monitor.sslDaysUntilExpiry} day${monitor.sslDaysUntilExpiry === 1 ? "" : "s"}`
            : "SSL certificate valid"}
          </p>
          {monitor.sslExpiresAt && <p className="text-xs opacity-70 mt-0.5">Expires {formatDate(monitor.sslExpiresAt)}</p>}
        </div>
      )}

      {!isDomain && !isTcp && !isHeartbeat && !isWordPress && monitor.keywordExpected && (
        <div className={`px-4 py-3 rounded-xl border text-sm ${
          monitor.keywordFound === null ? "bg-gray-50 border-gray-200 text-gray-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400"
          : monitor.keywordFound ? "bg-emerald-50 border-emerald-200 text-emerald-700"
          : "bg-red-50 border-red-200 text-red-700"
        }`}>
          <p className="font-medium">
            {monitor.keywordFound === null ? "Keyword check pending"
            : monitor.keywordFound ? "Keyword found"
            : "Keyword not found on page"}
          </p>
          <p className="text-xs opacity-70 mt-0.5">
            {monitor.keywordFound === false ? `"${monitor.keywordExpected}" was not in the last response.` : `Checking for: "${monitor.keywordExpected}"`}
          </p>
        </div>
      )}

      {!isDomain && !isTcp && !isHeartbeat && !isWordPress && monitor.jsonAssertPath && (
        <div className={`px-4 py-3 rounded-xl border text-sm ${
          monitor.jsonAssertFailed ? "bg-red-50 border-red-200 text-red-700"
          : "bg-emerald-50 border-emerald-200 text-emerald-700"
        }`}>
          <p className="font-medium">
            {monitor.jsonAssertFailed ? "JSON assertion failing" : "JSON assertion passing"}
          </p>
          <p className="text-xs opacity-70 mt-0.5 font-mono">
            {monitor.jsonAssertPath} == &quot;{monitor.jsonAssertExpected}&quot;
          </p>
        </div>
      )}

      {isWordPress && monitor.wpInMaintenanceMode && (
        <div className="px-4 py-3 rounded-xl border border-yellow-200 bg-yellow-50 text-yellow-800 text-sm">
          <p className="font-medium">Site is in maintenance mode</p>
          <p className="text-xs opacity-70 mt-0.5">Downtime alerts may be false positives while this is active.</p>
        </div>
      )}

      {isWordPress && monitor.wpVersionStatus && monitor.wpVersionStatus !== "current" && (
        <div className={`px-4 py-3 rounded-xl border text-sm ${
          monitor.wpVersionStatus === "outdated_major" ? "bg-red-50 border-red-200 text-red-700" : "bg-amber-50 border-amber-200 text-amber-700"
        }`}>
          <p className="font-medium">
            {monitor.wpVersionStatus === "outdated_major"
              ? `WordPress is a major version behind (${monitor.wpVersion} → ${monitor.wpLatestVersion})`
              : `WordPress update available (${monitor.wpVersion} → ${monitor.wpLatestVersion})`}
          </p>
          <p className="text-xs opacity-70 mt-0.5">Update to receive security patches.</p>
        </div>
      )}

      {hasShopifyData && shopifyChecks?.passwordModeEnabled && (
        <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
          <p className="font-medium">Store is in password mode — customers cannot browse or purchase</p>
          <p className="text-xs opacity-70 mt-0.5">Disable the storefront password in Shopify Admin → Online Store → Preferences.</p>
        </div>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // TAB: OVERVIEW
  // ─────────────────────────────────────────────────────────────────────────────

  if (activeTab === "overview") {
    return (
      <div>
        {header}
        <TabBar monitorId={monitor.id} active="overview" showInsights={showInsights} insightsBadge={insightsBadge} incidentCount={incidentCount} />
        {alertBanners}
        {statsGrid}
        {!isDomain && !isHeartbeat && !isWordPress && (
          <div className="mb-8">
            <ResponseTimeChart monitorId={monitor.id} />
          </div>
        )}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Recent checks</h2>
          <ChecksLog checks={monitor.checks} />
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TAB: INSIGHTS
  // ─────────────────────────────────────────────────────────────────────────────

  if (activeTab === "insights") {
    return (
      <div>
        {header}
        <TabBar monitorId={monitor.id} active="insights" showInsights={showInsights} insightsBadge={insightsBadge} incidentCount={incidentCount} />

        {/* WordPress */}
        {(isWordPress || hasWpData) && (
          <div className="space-y-4 mb-8">
            {monitor.wpScannedAt && wpSecurityChecks && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">WordPress security</h2>
                  {wpSecurityIssueCount > 0 && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                      {wpSecurityIssueCount} issue{wpSecurityIssueCount !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div className="space-y-3">
                  {(
                    [
                      { key: "xmlrpcEnabled",           label: "XML-RPC disabled",                        pass: !wpSecurityChecks.xmlrpcEnabled },
                      { key: "loginPageExposed",         label: "Login page protected",                    pass: !wpSecurityChecks.loginPageExposed },
                      { key: "directoryListingEnabled",  label: "Directory listing disabled",              pass: !wpSecurityChecks.directoryListingEnabled },
                      { key: "defaultAdminUrl",          label: "Admin URL customised",                    pass: !wpSecurityChecks.defaultAdminUrl },
                      { key: "wpConfigExposed",          label: "wp-config.php not publicly accessible",   pass: !wpSecurityChecks.wpConfigExposed },
                      { key: "debugModeEnabled",         label: "Debug mode disabled (WP_DEBUG)",          pass: !wpSecurityChecks.debugModeEnabled },
                      { key: "sslInvalid",               label: "SSL certificate chain complete",          pass: !wpSecurityChecks.sslInvalid },
                      { key: "userEnumerationEnabled",   label: "User enumeration blocked",                pass: !wpSecurityChecks.userEnumerationEnabled },
                      { key: "debugLogExposed",          label: "debug.log not publicly accessible",       pass: !wpSecurityChecks.debugLogExposed },
                      { key: "installPhpAccessible",     label: "install.php not accessible",              pass: !wpSecurityChecks.installPhpAccessible },
                      { key: "backupFilesExposed",       label: "No backup files in web root",             pass: !wpSecurityChecks.backupFilesExposed },
                      { key: "outdatedPhp",              label: `PHP version current${wpSecurityChecks.detectedPhpVersion ? ` (${wpSecurityChecks.detectedPhpVersion})` : ""}`, pass: !wpSecurityChecks.outdatedPhp },
                      { key: "missingHsts",              label: "HSTS header present",                        pass: !wpSecurityChecks.missingHsts },
                      { key: "missingXFrameOptions",     label: "X-Frame-Options header set",                 pass: !wpSecurityChecks.missingXFrameOptions },
                      { key: "missingXContentTypeOptions", label: "X-Content-Type-Options header set",        pass: !wpSecurityChecks.missingXContentTypeOptions },
                      { key: "serverVersionDisclosed",   label: `Server version not disclosed${wpSecurityChecks.detectedServerHeader ? ` (${wpSecurityChecks.detectedServerHeader})` : ""}`, pass: !wpSecurityChecks.serverVersionDisclosed },
                    ] as { key: string; label: string; pass: boolean }[]
                  ).map(({ key, label, pass }) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300">{label}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        pass ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                             : "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                      }`}>
                        {pass ? "Pass" : "Fail"}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">Last scanned {formatDate(monitor.wpScannedAt)}</p>
              </div>
            )}

            {wpThemeList.length > 0 && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Themes <span className="text-xs font-normal text-gray-400">({wpThemeList.length})</span>
                </h2>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Update status from WordPress.org</p>
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 items-center pb-2 mb-1 border-b border-gray-100 dark:border-gray-800 text-xs font-medium text-gray-400 uppercase tracking-wide">
                  <span>Theme</span><span className="text-right">Detected</span><span className="text-right">Latest</span><span className="text-right">Status</span>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {wpThemeList.sort((a, b) => ({ removed: 0, abandoned: 1, outdated: 2, unknown: 3, ok: 4 }[a.status] ?? 3) - ({ removed: 0, abandoned: 1, outdated: 2, unknown: 3, ok: 4 }[b.status] ?? 3)).map((t) => (
                    <div key={t.slug} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 items-center py-2.5 text-sm">
                      <div className="min-w-0">
                        <span className="font-mono text-gray-700 dark:text-gray-300 truncate block">{t.slug}</span>
                        {t.lastUpdated && !isNaN(new Date(t.lastUpdated).getTime()) && (
                          <span className="text-xs text-gray-400">Last updated {new Date(t.lastUpdated).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 text-right font-mono">{t.version ?? "—"}</span>
                      <span className="text-xs text-gray-500 text-right font-mono">{t.latestVersion ?? "—"}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
                        t.status === "removed" || t.status === "abandoned" ? "bg-red-50 text-red-600"
                        : t.status === "outdated" ? "bg-amber-50 text-amber-700"
                        : t.status === "ok" ? "bg-emerald-50 text-emerald-700"
                        : "bg-gray-100 text-gray-500"
                      }`}>
                        {t.status === "removed" ? "Removed" : t.status === "abandoned" ? "Abandoned" : t.status === "outdated" ? "Outdated" : t.status === "ok" ? "Up to date" : "Unknown"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {wpPluginList.length > 0 && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Plugins <span className="text-xs font-normal text-gray-400">({wpPluginList.length} found in page source)</span>
                </h2>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Version, update status and abandonment data from WordPress.org</p>
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 items-center pb-2 mb-1 border-b border-gray-100 dark:border-gray-800 text-xs font-medium text-gray-400 uppercase tracking-wide">
                  <span>Plugin</span><span className="text-right">Detected</span><span className="text-right">Latest</span><span className="text-right">Status</span>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {wpPluginList.sort((a, b) => ({ removed: 0, abandoned: 1, outdated: 2, unknown: 3, ok: 4 }[a.status] ?? 3) - ({ removed: 0, abandoned: 1, outdated: 2, unknown: 3, ok: 4 }[b.status] ?? 3)).map((p) => (
                    <div key={p.slug} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 items-center py-2.5 text-sm">
                      <div className="min-w-0">
                        <span className="font-mono text-gray-700 dark:text-gray-300 truncate block">{p.slug}</span>
                        {p.lastUpdated && !isNaN(new Date(p.lastUpdated).getTime()) && (
                          <span className="text-xs text-gray-400">Last updated {new Date(p.lastUpdated).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 text-right font-mono">{p.version ?? "—"}</span>
                      <span className="text-xs text-gray-500 text-right font-mono">{p.latestVersion ?? "—"}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
                        p.status === "removed" || p.status === "abandoned" ? "bg-red-50 text-red-600"
                        : p.status === "outdated" ? "bg-amber-50 text-amber-700"
                        : p.status === "ok" ? "bg-emerald-50 text-emerald-700"
                        : "bg-gray-100 text-gray-500"
                      }`}>
                        {p.status === "removed" ? "Removed" : p.status === "abandoned" ? "Abandoned" : p.status === "outdated" ? "Outdated" : p.status === "ok" ? "Up to date" : "Unknown"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(monitor.wpGaTrackingId || monitor.wpGtmContainerId) && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Site metadata</h2>
                <div className="space-y-2">
                  {monitor.wpGaTrackingId && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Google Analytics</span>
                      <span className="font-mono text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{monitor.wpGaTrackingId}</span>
                    </div>
                  )}
                  {monitor.wpGtmContainerId && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Google Tag Manager</span>
                      <span className="font-mono text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{monitor.wpGtmContainerId}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Shopify */}
        {hasShopifyData && shopifyChecks && monitor.shopifyScannedAt && (
          <div className="mb-8">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Shopify store</h2>
                {shopifyChecks.themeName && (
                  <span className="text-xs text-gray-400 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{shopifyChecks.themeName}</span>
                )}
              </div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Availability</p>
              <div className="space-y-3 mb-5">
                {[
                  { label: "Storefront access", value: shopifyChecks.passwordModeEnabled ? "Password protected" : "Open", ok: !shopifyChecks.passwordModeEnabled },
                  { label: "Cart API", value: shopifyChecks.cartApiUp == null ? "Unknown" : shopifyChecks.cartApiUp ? "Healthy" : "Down", ok: shopifyChecks.cartApiUp ?? null },
                ].map(({ label, value, ok }) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{label}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      ok === null ? "bg-gray-100 dark:bg-gray-800 text-gray-500"
                      : ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                    }`}>{value}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Tracking & marketing</p>
              <div className="space-y-3 mb-5">
                {[
                  { label: "Google Analytics", present: shopifyChecks.gaPresent },
                  { label: "Meta Pixel", present: shopifyChecks.metaPixelPresent },
                  { label: "TikTok Pixel", present: shopifyChecks.tiktokPixelPresent },
                  { label: "Klaviyo", present: shopifyChecks.klaviyoPresent },
                  { label: "Cookie consent", present: shopifyChecks.cookieConsentPresent },
                ].map(({ label, present }) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{label}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${present ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>
                      {present ? "Detected" : "Not detected"}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Apps</p>
              <div className="space-y-3">
                {[
                  { label: "Reviews app", value: shopifyChecks.reviewsApp },
                  { label: "Live chat", value: shopifyChecks.liveChat },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{label}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${value ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>
                      {value ?? "Not detected"}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">Last scanned {formatDate(monitor.shopifyScannedAt)}. Scans run daily.</p>
            </div>
          </div>
        )}

        {/* HTTP security headers */}
        {!isWordPress && monitor.httpSecurityCheckedAt && httpSecurityChecks && (
          <div className="mb-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Security headers</h2>
              {httpSecurityIssueCount > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">{httpSecurityIssueCount} issue{httpSecurityIssueCount !== 1 ? "s" : ""}</span>
              )}
            </div>
            <div className="space-y-3">
              {([
                { key: "missingHsts",                label: "HSTS (Strict-Transport-Security)",   pass: !httpSecurityChecks.missingHsts },
                { key: "missingXFrameOptions",       label: "X-Frame-Options",                    pass: !httpSecurityChecks.missingXFrameOptions },
                { key: "missingXContentTypeOptions", label: "X-Content-Type-Options",             pass: !httpSecurityChecks.missingXContentTypeOptions },
                { key: "missingCsp",                 label: "Content-Security-Policy",            pass: !httpSecurityChecks.missingCsp },
                { key: "serverVersionDisclosed",     label: `Server version hidden${httpSecurityChecks.detectedServerHeader ? ` (${httpSecurityChecks.detectedServerHeader})` : ""}`, pass: !httpSecurityChecks.serverVersionDisclosed },
                { key: "missingReferrerPolicy",      label: "Referrer-Policy",                    pass: !httpSecurityChecks.missingReferrerPolicy },
              ] as { key: string; label: string; pass: boolean }[]).map(({ key, label, pass }) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300">{label}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pass ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {pass ? "Present" : "Missing"}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">Last checked {formatDate(monitor.httpSecurityCheckedAt)}.</p>
          </div>
        )}

        {/* Content / robots / DNS */}
        {!isWordPress && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Content</h2>
              {monitor.contentHash ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Status</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Tracking</span>
                  </div>
                  {monitor.contentChangedAt && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Last changed</span>
                      <span className="text-xs text-gray-700 dark:text-gray-300">{formatDate(monitor.contentChangedAt)}</span>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 pt-1">Alerts on page content changes.</p>
                </div>
              ) : <p className="text-xs text-gray-400">Pending first check.</p>}
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">robots.txt</h2>
              {monitor.robotsTxtCheckedAt ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Crawlers</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${monitor.robotsTxtBlocksAll ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>
                      {monitor.robotsTxtBlocksAll ? "Blocked" : "Allowed"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 pt-1">Last checked {formatDate(monitor.robotsTxtCheckedAt)}.</p>
                </div>
              ) : <p className="text-xs text-gray-400">Pending first check.</p>}
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">DNS</h2>
              {dnsIps ? (
                <div className="space-y-2">
                  {dnsIps.map((ip) => (
                    <span key={ip} className="block text-xs font-mono text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">{ip}</span>
                  ))}
                  {monitor.dnsChangedAt && <p className="text-xs text-amber-600 pt-1">Changed {formatDate(monitor.dnsChangedAt)}</p>}
                  {monitor.dnsCheckedAt && <p className="text-xs text-gray-400 pt-1">Last checked {formatDate(monitor.dnsCheckedAt)}.</p>}
                </div>
              ) : <p className="text-xs text-gray-400">Pending first check.</p>}
            </div>
          </div>
        )}

        {!showInsights && (
          <p className="text-sm text-gray-400">No insights available for this monitor type.</p>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TAB: INCIDENTS
  // ─────────────────────────────────────────────────────────────────────────────

  if (activeTab === "incidents") {
    return (
      <div>
        {header}
        <TabBar monitorId={monitor.id} active="incidents" showInsights={showInsights} insightsBadge={insightsBadge} incidentCount={incidentCount} />
        <IncidentHistory alerts={monitor.alerts} monitorId={monitor.id} />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TAB: SETTINGS
  // ─────────────────────────────────────────────────────────────────────────────

  const maintenanceWindows = await prisma.maintenanceWindow.findMany({
    where: { monitorId: id, userId: user.id },
    orderBy: { startsAt: "asc" },
  });

  type MaintenanceWindowRow = (typeof maintenanceWindows)[number];

  return (
    <div>
      {header}
      <TabBar monitorId={monitor.id} active="settings" showInsights={showInsights} insightsBadge={insightsBadge} incidentCount={incidentCount} />
      <div className="flex flex-col gap-6">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <MonitorForm
            defaultValues={{
              id: monitor.id,
              type: monitor.type as "HTTP" | "DOMAIN" | "TCP" | "HEARTBEAT" | "WORDPRESS",
              name: monitor.name,
              url: monitor.url ?? undefined,
              port: monitor.port,
              intervalMinutes: monitor.intervalMinutes,
              recipients: monitor.recipients,
              sslEnabled: monitor.sslEnabled,
              heartbeatToken: monitor.heartbeatToken,
              responseTimeThreshold: monitor.responseTimeThreshold,
              webhookUrl: monitor.webhookUrl,
              keywordExpected: monitor.keywordExpected,
              jsonAssertPath: monitor.jsonAssertPath,
              jsonAssertExpected: monitor.jsonAssertExpected,
              projectId: monitor.projectId ?? undefined,
              escalationThresholdMinutes: monitor.escalationThresholdMinutes,
              escalationRecipients: monitor.escalationRecipients,
            }}
            ownerEmail={user.email}
          />
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <MonitorMaintenanceSection
            monitorId={monitor.id}
            initialWindows={maintenanceWindows.map((w: MaintenanceWindowRow) => ({
              id: w.id,
              name: w.name,
              startsAt: w.startsAt.toISOString(),
              endsAt: w.endsAt.toISOString(),
            }))}
          />
        </div>
      </div>
    </div>
  );
}
