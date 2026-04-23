import axios from "axios";
import https from "https";

export type WpPluginStatus = "ok" | "outdated" | "abandoned" | "removed" | "unknown";

export interface WpPlugin {
  slug: string;
  version: string | null;       // detected on site
  latestVersion: string | null; // from WP.org
  lastUpdated: string | null;   // ISO date from WP.org
  status: WpPluginStatus;
}

export type WpThemeStatus = "ok" | "outdated" | "abandoned" | "removed" | "unknown";

export interface WpTheme {
  slug: string;
  version: string | null;
  latestVersion: string | null;
  lastUpdated: string | null;
  status: WpThemeStatus;
}

export interface WpSecurityChecks {
  xmlrpcEnabled: boolean;
  loginPageExposed: boolean;
  directoryListingEnabled: boolean;
  defaultAdminUrl: boolean;
  wpConfigExposed: boolean;
  debugModeEnabled: boolean;
  sslInvalid: boolean;
  userEnumerationEnabled: boolean;
  debugLogExposed: boolean;
  installPhpAccessible: boolean;
  backupFilesExposed: boolean;
  // Header-derived (zero extra HTTP requests)
  outdatedPhp: boolean;
  detectedPhpVersion: string | null;
  missingHsts: boolean;
  missingXFrameOptions: boolean;
  missingXContentTypeOptions: boolean;
  serverVersionDisclosed: boolean;
  detectedServerHeader: string | null;
}

export type WpVersionStatus = "current" | "outdated_minor" | "outdated_major" | "unknown";

export interface WordPressCheckResult {
  isUp: boolean;
  statusCode: number | null;
  responseTime: number | null;
  error: string | null;
  wpVersion: string | null;
  wpVersionStatus: WpVersionStatus | null;
  wpLatestVersion: string | null;
  wpPlugins: WpPlugin[];
  wpThemes: WpTheme[];
  wpSecurityChecks: WpSecurityChecks | null;
  wpInMaintenanceMode: boolean;
  wpGaTrackingId: string | null;
  wpGtmContainerId: string | null;
}

// Hard deadline for the full check (initial fetch + all secondary probes).
// If this fires we still return whatever partial result the initial fetch gave us
// rather than falsely marking the site as down.
const OUTER_TIMEOUT_MS = 30_000;

export async function checkWordPress(url: string): Promise<WordPressCheckResult> {
  const timeout = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), OUTER_TIMEOUT_MS),
  );

  // Race the full check against the timeout.
  // On timeout we get null, so fall back to a quick uptime-only check.
  const result = await Promise.race([_checkWordPress(url), timeout]);
  if (result !== null) return result;

  // Timeout fired — do a minimal fetch so isUp is still accurate
  return _checkUptimeOnly(url);
}

async function _checkUptimeOnly(url: string): Promise<WordPressCheckResult> {
  const base = url.replace(/\/$/, "");
  const start = Date.now();
  try {
    const res = await fetch(base, { signal: AbortSignal.timeout(8_000) });
    return {
      isUp: res.status < 400,
      statusCode: res.status,
      responseTime: Date.now() - start,
      error: null,
      wpVersion: null, wpVersionStatus: null, wpLatestVersion: null,
      wpPlugins: [], wpThemes: [], wpSecurityChecks: null,
      wpInMaintenanceMode: false, wpGaTrackingId: null, wpGtmContainerId: null,
    };
  } catch {
    return {
      isUp: false,
      statusCode: null,
      responseTime: Date.now() - start,
      error: "WordPress check timed out",
      wpVersion: null, wpVersionStatus: null, wpLatestVersion: null,
      wpPlugins: [], wpThemes: [], wpSecurityChecks: null,
      wpInMaintenanceMode: false, wpGaTrackingId: null, wpGtmContainerId: null,
    };
  }
}

async function _checkWordPress(url: string): Promise<WordPressCheckResult> {
  // Normalise — strip trailing slash, ensure https/http
  const base = url.replace(/\/$/, "");

  // ── 1. Uptime + HTML fetch ──────────────────────────────────────────────────
  const start = Date.now();
  let isUp = false;
  let statusCode: number | null = null;
  let responseTime: number | null = null;
  let error: string | null = null;
  let html = "";
  let sslInvalid = false;
  let responseHeaders: Record<string, string> = {};

  const fetchOpts = {
    timeout: 10_000,
    validateStatus: (s: number) => s < 500,
    headers: { "User-Agent": "Upleus-Monitor/1.0" },
    maxRedirects: 5,
  };

  try {
    const res = await axios.get<string>(base, fetchOpts);
    isUp = res.status < 400;
    statusCode = res.status;
    responseTime = Date.now() - start;
    html = typeof res.data === "string" ? res.data : "";
    responseHeaders = normaliseHeaders(res.headers);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    const isSslError =
      msg.includes("certificate") ||
      msg.includes("self-signed") ||
      msg.includes("CERT_") ||
      msg.includes("SSL");

    if (isSslError) {
      // Site has an SSL issue — still fetch with verification disabled so we
      // can report version/plugin/security data, but flag the SSL problem.
      sslInvalid = true;
      try {
        const relaxedAgent = new https.Agent({ rejectUnauthorized: false });
        const res = await axios.get<string>(base, { ...fetchOpts, httpsAgent: relaxedAgent });
        isUp = res.status < 400;
        statusCode = res.status;
        responseTime = Date.now() - start;
        html = typeof res.data === "string" ? res.data : "";
        responseHeaders = normaliseHeaders(res.headers);
      } catch (innerErr) {
        isUp = false;
        error = innerErr instanceof Error ? innerErr.message : "Request failed";
        responseTime = Date.now() - start;
        return {
          isUp, statusCode, responseTime, error,
          wpVersion: null, wpVersionStatus: null, wpLatestVersion: null,
          wpPlugins: [], wpThemes: [], wpSecurityChecks: null,
          wpInMaintenanceMode: false, wpGaTrackingId: null, wpGtmContainerId: null,
        };
      }
    } else {
      isUp = false;
      error = err instanceof Error ? err.message : "Request failed";
      responseTime = Date.now() - start;
      return {
        isUp, statusCode, responseTime, error,
        wpVersion: null, wpVersionStatus: null, wpLatestVersion: null,
        wpPlugins: [], wpThemes: [], wpSecurityChecks: null,
        wpInMaintenanceMode: false, wpGaTrackingId: null, wpGtmContainerId: null,
      };
    }
  }

  // ── 2-4. Run all secondary checks in parallel ──────────────────────────────
  const wpVersionFromHtml = detectWpVersion(html);
  const rawPlugins = detectPlugins(html);
  const rawThemes  = detectThemes(html);
  const tracking   = detectTracking(html);

  const [wpVersionAlt, latestVersion, wpPlugins, wpThemes, wpSecurityChecks] = await Promise.all([
    wpVersionFromHtml ? Promise.resolve(null) : fetchWpVersionFromAltSources(base),
    fetchLatestWpVersion(),
    enrichPlugins(rawPlugins),
    enrichThemes(rawThemes),
    runSecurityChecks(base, html, sslInvalid, responseHeaders),
  ]);

  const wpVersion = wpVersionFromHtml ?? wpVersionAlt;
  const wpVersionStatus = wpVersion && latestVersion
    ? compareVersions(wpVersion, latestVersion)
    : null;

  return {
    isUp,
    statusCode,
    responseTime,
    error,
    wpVersion,
    wpVersionStatus,
    wpLatestVersion: latestVersion,
    wpPlugins,
    wpThemes,
    wpSecurityChecks,
    wpInMaintenanceMode: detectMaintenanceMode(html),
    wpGaTrackingId: tracking.gaId,
    wpGtmContainerId: tracking.gtmId,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function detectWpVersion(html: string): string | null {
  // <meta name="generator" content="WordPress 6.5.2" />
  const generatorMatch = html.match(
    /<meta[^>]+name=["']generator["'][^>]+content=["']WordPress\s+([\d.]+)["']/i,
  );
  if (generatorMatch) return generatorMatch[1];

  // Also try content before name ordering
  const altMatch = html.match(
    /<meta[^>]+content=["']WordPress\s+([\d.]+)["'][^>]+name=["']generator["']/i,
  );
  if (altMatch) return altMatch[1];

  return null;
}

async function fetchLatestWpVersion(): Promise<string | null> {
  try {
    const res = await axios.get<{ offers: { version: string }[] }>(
      "https://api.wordpress.org/core/version-check/1.7/",
      { timeout: 8_000 },
    );
    return res.data?.offers?.[0]?.version ?? null;
  } catch {
    return null;
  }
}

function compareVersions(current: string, latest: string): WpVersionStatus {
  const c = current.split(".").map(Number);
  const l = latest.split(".").map(Number);
  if (c[0] !== l[0]) return "outdated_major";
  if ((c[1] ?? 0) !== (l[1] ?? 0)) return "outdated_minor";
  if ((c[2] ?? 0) < (l[2] ?? 0)) return "outdated_minor";
  return "current";
}

function detectPlugins(html: string): { slug: string; version: string | null }[] {
  // Extract all unique plugin slugs from /wp-content/plugins/SLUG/ references
  const slugSet = new Set<string>();
  const regex = /\/wp-content\/plugins\/([a-z0-9_-]+)\//gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    slugSet.add(match[1].toLowerCase());
  }

  // Try to extract version from script/style src query strings: ?ver=X.Y.Z
  const versionMap = new Map<string, string>();
  const versionRegex =
    /\/wp-content\/plugins\/([a-z0-9_-]+)\/[^"']*\?(?:[^"']*&)?ver=([\d.]+)/gi;
  while ((match = versionRegex.exec(html)) !== null) {
    const slug = match[1].toLowerCase();
    if (!versionMap.has(slug)) versionMap.set(slug, match[2]);
  }

  return Array.from(slugSet).map((slug) => ({
    slug,
    version: versionMap.get(slug) ?? null,
  }));
}

// ── Theme detection ───────────────────────────────────────────────────────────

function detectThemes(html: string): { slug: string; version: string | null }[] {
  const slugSet = new Set<string>();
  const regex = /\/wp-content\/themes\/([a-z0-9_-]+)\//gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    slugSet.add(match[1].toLowerCase());
  }

  const versionMap = new Map<string, string>();
  const versionRegex = /\/wp-content\/themes\/([a-z0-9_-]+)\/[^"']*\?(?:[^"']*&)?ver=([\d.]+)/gi;
  while ((match = versionRegex.exec(html)) !== null) {
    const slug = match[1].toLowerCase();
    if (!versionMap.has(slug)) versionMap.set(slug, match[2]);
  }

  return Array.from(slugSet).map((slug) => ({
    slug,
    version: versionMap.get(slug) ?? null,
  }));
}

interface WpOrgThemeInfo {
  version?: string;
  last_updated?: string;
  closed?: boolean;
}

async function fetchWpOrgThemeInfo(slug: string): Promise<WpOrgThemeInfo | null> {
  try {
    const res = await axios.get<WpOrgThemeInfo>(
      `https://api.wordpress.org/themes/info/1.1/?action=theme_information&request[slug]=${slug}&request[fields][last_updated]=1`,
      { timeout: 6_000 },
    );
    if (typeof res.data !== "object" || res.data === null) return null;
    // WP.org returns false (not an object) for unknown themes
    if (res.data === false as unknown) return null;
    return res.data;
  } catch {
    return null;
  }
}

async function enrichThemes(
  raw: { slug: string; version: string | null }[],
): Promise<WpTheme[]> {
  if (raw.length === 0) return [];

  const results = await Promise.allSettled(
    raw.map((t) => fetchWpOrgThemeInfo(t.slug)),
  );

  return raw.map((t, i) => {
    const info = results[i].status === "fulfilled" ? results[i].value : null;
    const { status, latestVersion, lastUpdated } = classifyPlugin(t.version, info);
    return { slug: t.slug, version: t.version, latestVersion, lastUpdated, status };
  });
}

// ── Maintenance mode detection ────────────────────────────────────────────────

function detectMaintenanceMode(html: string): boolean {
  return (
    /maintenance mode/i.test(html) ||
    /coming soon/i.test(html) ||
    /under construction/i.test(html) ||
    /we.?re (currently )?down for maintenance/i.test(html) ||
    /site will be back (online |up )?soon/i.test(html) ||
    // Common plugin class/ID patterns
    /class=["'][^"']*maintenance/i.test(html) ||
    /class=["'][^"']*coming.?soon/i.test(html) ||
    /wp-maintenance-mode/i.test(html) ||
    /seedprod/i.test(html) ||
    /id=["']coming-soon/i.test(html)
  );
}

// ── Analytics / tracking ID detection ────────────────────────────────────────

function detectTracking(html: string): { gaId: string | null; gtmId: string | null } {
  // Classic GA (UA-XXXXXXXX-X) and GA4 (G-XXXXXXXXXX)
  const gaMatch  = html.match(/\b(UA-\d{4,12}-\d{1,4}|G-[A-Z0-9]{6,12})\b/);
  const gtmMatch = html.match(/\bGTM-[A-Z0-9]{4,8}\b/);
  return {
    gaId:  gaMatch?.[1]  ?? null,
    gtmId: gtmMatch?.[0] ?? null,
  };
}

// ── WordPress.org plugin enrichment ──────────────────────────────────────────

interface WpOrgPluginInfo {
  version?: string;
  last_updated?: string; // "2024-01-15 12:00am GMT"
  closed?: boolean;
}

async function fetchWpOrgPluginInfo(slug: string): Promise<WpOrgPluginInfo | null> {
  try {
    const res = await axios.get<WpOrgPluginInfo>(
      `https://api.wordpress.org/plugins/info/1.2/?action=plugin_information&request[slug]=${slug}&request[fields][last_updated]=1&request[fields][closed]=1`,
      { timeout: 6_000 },
    );
    if (typeof res.data !== "object" || res.data === null) return null;
    return res.data;
  } catch {
    return null;
  }
}

const ABANDONED_DAYS = 365;

function classifyPlugin(
  detectedVersion: string | null,
  info: WpOrgPluginInfo | null,
): { status: WpPluginStatus; latestVersion: string | null; lastUpdated: string | null } {
  if (!info) return { status: "unknown", latestVersion: null, lastUpdated: null };

  if (info.closed) return { status: "removed", latestVersion: info.version ?? null, lastUpdated: null };

  const lastUpdated = (() => {
    if (!info.last_updated) return null;
    // WP.org returns "2024-01-15 2:45am GMT" — normalize to something Date can parse
    const normalized = info.last_updated.replace(/(\d)(am|pm)/i, "$1 $2");
    const d = new Date(normalized);
    return isNaN(d.getTime()) ? null : d.toISOString();
  })();

  const daysSinceUpdate = lastUpdated
    ? Math.floor((Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const latestVersion = info.version ?? null;

  // Abandoned: not updated in over a year
  if (daysSinceUpdate !== null && daysSinceUpdate > ABANDONED_DAYS) {
    return { status: "abandoned", latestVersion, lastUpdated };
  }

  // Outdated: detected version is behind latest
  if (detectedVersion && latestVersion && detectedVersion !== latestVersion) {
    return { status: "outdated", latestVersion, lastUpdated };
  }

  return { status: "ok", latestVersion, lastUpdated };
}

async function enrichPlugins(
  raw: { slug: string; version: string | null }[],
): Promise<WpPlugin[]> {
  if (raw.length === 0) return [];

  const results = await Promise.allSettled(
    raw.map((p) => fetchWpOrgPluginInfo(p.slug)),
  );

  return raw.map((p, i) => {
    const info = results[i].status === "fulfilled" ? results[i].value : null;
    const { status, latestVersion, lastUpdated } = classifyPlugin(p.version, info);
    return { slug: p.slug, version: p.version, latestVersion, lastUpdated, status };
  });
}

async function runSecurityChecks(
  base: string,
  html: string,
  sslInvalid: boolean,
  headers: Record<string, string>,
): Promise<WpSecurityChecks> {
  const agent = sslInvalid ? new https.Agent({ rejectUnauthorized: false }) : undefined;
  const isHttps = base.startsWith("https://");

  const [xmlrpc, login, uploads, admin, wpConfig, userEnum, debugLog, installPhp, backups] =
    await Promise.allSettled([
      probeXmlRpc(base, agent),
      probeLoginPage(base, agent),
      probeDirectoryListing(base, agent),
      probeAdminUrl(base, agent),
      probeWpConfig(base, agent),
      probeUserEnumeration(base, agent),
      probeDebugLog(base, agent),
      probeInstallPhp(base, agent),
      probeBackupFiles(base, agent),
    ]);

  const phpInfo    = detectPhpVersion(headers);
  const serverInfo = detectServerVersion(headers);

  return {
    xmlrpcEnabled:           xmlrpc.status     === "fulfilled" ? xmlrpc.value     : false,
    loginPageExposed:        login.status      === "fulfilled" ? login.value      : false,
    directoryListingEnabled: uploads.status    === "fulfilled" ? uploads.value    : false,
    defaultAdminUrl:         admin.status      === "fulfilled" ? admin.value      : false,
    wpConfigExposed:         wpConfig.status   === "fulfilled" ? wpConfig.value   : false,
    debugModeEnabled:        detectDebugMode(html),
    sslInvalid,
    userEnumerationEnabled:  userEnum.status   === "fulfilled" ? userEnum.value   : false,
    debugLogExposed:         debugLog.status   === "fulfilled" ? debugLog.value   : false,
    installPhpAccessible:    installPhp.status === "fulfilled" ? installPhp.value : false,
    backupFilesExposed:      backups.status    === "fulfilled" ? backups.value    : false,
    outdatedPhp:             phpInfo.outdated,
    detectedPhpVersion:      phpInfo.version,
    missingHsts:             isHttps && !headers["strict-transport-security"],
    missingXFrameOptions:    !headers["x-frame-options"],
    missingXContentTypeOptions: !headers["x-content-type-options"],
    serverVersionDisclosed:  serverInfo.disclosed,
    detectedServerHeader:    serverInfo.header,
  };
}

async function probeXmlRpc(base: string, agent?: https.Agent): Promise<boolean> {
  try {
    const res = await axios.get(`${base}/xmlrpc.php`, {
      timeout: 6_000,
      validateStatus: () => true,
      maxRedirects: 0,
      httpsAgent: agent,
    });
    return res.status === 200 || res.status === 405;
  } catch {
    return false;
  }
}

async function probeLoginPage(base: string, agent?: https.Agent): Promise<boolean> {
  try {
    const res = await axios.get(`${base}/wp-login.php`, {
      timeout: 6_000,
      validateStatus: () => true,
      maxRedirects: 5,
      httpsAgent: agent,
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

async function probeDirectoryListing(base: string, agent?: https.Agent): Promise<boolean> {
  try {
    const res = await axios.get<string>(`${base}/wp-content/uploads/`, {
      timeout: 6_000,
      validateStatus: () => true,
      maxRedirects: 0,
      httpsAgent: agent,
    });
    if (res.status !== 200) return false;
    const body = typeof res.data === "string" ? res.data : "";
    return /index of/i.test(body);
  } catch {
    return false;
  }
}

async function probeAdminUrl(base: string, agent?: https.Agent): Promise<boolean> {
  try {
    const res = await axios.get(`${base}/wp-admin/`, {
      timeout: 6_000,
      validateStatus: () => true,
      maxRedirects: 0,
      httpsAgent: agent,
    });
    if (res.status === 302 || res.status === 301) {
      const location = (res.headers["location"] as string | undefined) ?? "";
      return location.includes("wp-login.php");
    }
    return res.status === 200;
  } catch {
    return false;
  }
}

async function probeWpConfig(base: string, agent?: https.Agent): Promise<boolean> {
  const [main, bak] = await Promise.allSettled([
    axios.get(`${base}/wp-config.php`, {
      timeout: 6_000,
      validateStatus: () => true,
      maxRedirects: 0,
      httpsAgent: agent,
    }),
    axios.get(`${base}/wp-config.php.bak`, {
      timeout: 6_000,
      validateStatus: () => true,
      maxRedirects: 0,
      httpsAgent: agent,
    }),
  ]);
  const s1 = main.status === "fulfilled" ? main.value.status : 0;
  const s2 = bak.status === "fulfilled" ? bak.value.status : 0;
  return s1 === 200 || s2 === 200;
}

async function probeUserEnumeration(base: string, agent?: https.Agent): Promise<boolean> {
  // REST API: /wp-json/wp/v2/users returns a non-empty array when enumeration is open
  // Author archive: /?author=1 redirects to /author/<username>/ revealing the login name
  const [restResult, authorResult] = await Promise.allSettled([
    axios.get(`${base}/wp-json/wp/v2/users`, {
      timeout: 6_000,
      validateStatus: () => true,
      maxRedirects: 0,
      httpsAgent: agent,
    }),
    axios.get(`${base}/?author=1`, {
      timeout: 6_000,
      validateStatus: () => true,
      maxRedirects: 0,
      httpsAgent: agent,
    }),
  ]);

  if (restResult.status === "fulfilled") {
    const res = restResult.value;
    if (res.status === 200 && Array.isArray(res.data) && res.data.length > 0) return true;
  }
  if (authorResult.status === "fulfilled") {
    const res = authorResult.value;
    if ((res.status === 301 || res.status === 302)) {
      const location = (res.headers["location"] as string | undefined) ?? "";
      if (location.includes("/author/")) return true;
    }
  }
  return false;
}

async function probeDebugLog(base: string, agent?: https.Agent): Promise<boolean> {
  try {
    const res = await axios.get(`${base}/wp-content/debug.log`, {
      timeout: 6_000,
      validateStatus: () => true,
      maxRedirects: 0,
      httpsAgent: agent,
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

async function probeInstallPhp(base: string, agent?: https.Agent): Promise<boolean> {
  try {
    const res = await axios.get(`${base}/wp-admin/install.php`, {
      timeout: 6_000,
      validateStatus: () => true,
      maxRedirects: 0,
      httpsAgent: agent,
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

const BACKUP_PATHS = [
  "/backup.zip",
  "/backup.sql",
  "/backup.tar.gz",
  "/db.sql",
  "/database.sql",
  "/wordpress.zip",
  "/wp-backup.zip",
  "/site.zip",
  "/site.tar.gz",
  "/dump.sql",
];

async function probeBackupFiles(base: string, agent?: https.Agent): Promise<boolean> {
  // Use HEAD to avoid downloading potentially huge archive/SQL files
  const results = await Promise.allSettled(
    BACKUP_PATHS.map((path) =>
      axios.head(`${base}${path}`, {
        timeout: 5_000,
        validateStatus: () => true,
        maxRedirects: 0,
        httpsAgent: agent,
      }),
    ),
  );
  return results.some(
    (r) => r.status === "fulfilled" && r.value.status === 200,
  );
}

// Normalise axios headers (which can be AxiosHeaders or plain object) to a
// simple lowercase-keyed string map so all lookups are consistent.
function normaliseHeaders(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string") out[k.toLowerCase()] = v;
    else if (Array.isArray(v)) out[k.toLowerCase()] = v.join(", ");
  }
  return out;
}

function detectPhpVersion(headers: Record<string, string>): { outdated: boolean; version: string | null } {
  const powered = headers["x-powered-by"] ?? "";
  const match = powered.match(/PHP\/([\d.]+)/i);
  if (!match) return { outdated: false, version: null };
  const version = match[1];
  const [major, minor = 0] = version.split(".").map(Number);
  // EOL threshold: PHP < 8.1
  const outdated = major < 8 || (major === 8 && minor < 1);
  return { outdated, version };
}

function detectServerVersion(headers: Record<string, string>): { disclosed: boolean; header: string | null } {
  const server = headers["server"] ?? "";
  if (!server) return { disclosed: false, header: null };
  // Flag when the Server header contains a version number (e.g. Apache/2.4.51, nginx/1.24.0)
  const disclosed = /[\d]+\.[\d]/.test(server);
  return { disclosed, header: server };
}

function detectDebugMode(html: string): boolean {
  // WP_DEBUG outputs PHP errors/warnings directly into the HTML response.
  return (
    /<b>(Fatal error|Parse error|Warning|Notice|Deprecated)<\/b>\s*:/i.test(html) ||
    /PHP (Fatal error|Parse error|Warning|Notice|Deprecated):/i.test(html)
  );
}

// ── Version fallback sources ─────────────────────────────────────────────────

async function fetchWpVersionFromAltSources(base: string): Promise<string | null> {
  // Run both probes in parallel; return first non-null result.
  const [readmeResult, feedResult] = await Promise.allSettled([
    fetchVersionFromReadme(base),
    fetchVersionFromFeed(base),
  ]);
  if (readmeResult.status === "fulfilled" && readmeResult.value) return readmeResult.value;
  if (feedResult.status === "fulfilled" && feedResult.value) return feedResult.value;
  return null;
}

async function fetchVersionFromReadme(base: string): Promise<string | null> {
  try {
    const res = await axios.get<string>(`${base}/readme.html`, {
      timeout: 6_000,
      validateStatus: (s) => s === 200,
      headers: { "User-Agent": "Upleus-Monitor/1.0" },
    });
    const body = typeof res.data === "string" ? res.data : "";
    // Heading like "== WordPress 6.5.2 ==" or "<h1>WordPress 6.5.2</h1>"
    const match = body.match(/WordPress\s+([\d]+\.[\d]+(?:\.[\d]+)?)/i);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

async function fetchVersionFromFeed(base: string): Promise<string | null> {
  try {
    const res = await axios.get<string>(`${base}/?feed=rss2`, {
      timeout: 6_000,
      validateStatus: (s) => s === 200,
      headers: { "User-Agent": "Upleus-Monitor/1.0" },
    });
    const body = typeof res.data === "string" ? res.data : "";
    // <generator>https://wordpress.org/?v=6.5.2</generator>
    const match = body.match(/<generator>[^<]*[?&]v=([\d]+\.[\d]+(?:\.[\d]+)?)<\/generator>/i);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
