import axios from "axios";
import https from "https";
import { prisma } from "@/lib/prisma";
import {
  sendDownAlert,
  sendRecoveryAlert,
  sendSslExpiryAlert,
  sendSslInvalidAlert,
  sendDomainExpiryAlert,
  sendSlowAlert,
  sendSlowRecoveredAlert,
} from "@/lib/alerter";
import { checkSsl } from "@/lib/checks/ssl";
import { checkDomain } from "@/lib/checks/domain";
import { checkTcp } from "@/lib/checks/tcp";
import { checkWordPress } from "@/lib/checks/wordpress";
import {
  sendWpOutdatedAlert,
  sendWpSecurityAlert,
  sendKeywordMissingAlert,
  sendKeywordFoundAlert,
  sendHttpSecurityAlert,
  sendShopifyPasswordModeAlert,
  sendShopifyPasswordClearedAlert,
  sendShopifyIssueAlert,
  sendContentChangedAlert,
  sendRobotsBlockingAlert,
  sendDnsChangedAlert,
  sendEscalationAlert,
  sendJsonAssertFailedAlert,
  sendJsonAssertRecoveredAlert,
} from "@/lib/alerter";
import { checkHttpSecurity, type HttpSecurityChecks } from "@/lib/checks/http-security";
import { looksLikeShopify, checkShopify, type ShopifyChecks } from "@/lib/checks/shopify";
import { hashContent } from "@/lib/checks/content";
import { checkRobots, type RobotsChecks } from "@/lib/checks/robots";
import { checkDns, type DnsResult } from "@/lib/checks/dns";

const SSL_THRESHOLDS = [1, 7, 30] as const;
const DOMAIN_THRESHOLDS = [1, 7, 14, 30] as const;

// Minimum gap between repeated alerts of the same type on the same monitor.
// Prevents alert storms when a monitor flaps up/down rapidly.
const ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

async function canSendAlert(monitorId: string, type: string, cooldownMs = ALERT_COOLDOWN_MS): Promise<boolean> {
  const since = new Date(Date.now() - cooldownMs);
  const recent = await prisma.alert.findFirst({
    where: { monitorId, type, sentAt: { gte: since } },
    select: { id: true },
  });
  return recent === null;
}

/** Simple deterministic shard bucket: sum of char codes mod totalShards. */
function shardOf(id: string, totalShards: number): number {
  let n = 0;
  for (let i = 0; i < id.length; i++) n += id.charCodeAt(i);
  return n % totalShards;
}

export async function runChecks(shardIndex?: number, totalShards?: number) {
  const now = new Date();

  const monitors = await prisma.monitor.findMany({
    where: { isActive: true, nextCheckAt: { lte: now } },
    select: {
      id: true,
      type: true,
      url: true,
      name: true,
      isUp: true,
      intervalMinutes: true,
      recipients: true,
      sslEnabled: true,
      sslValid: true,
      domainDaysUntilExpiry: true,
      domainCheckedAt: true,
      port: true,
      responseTimeThreshold: true,
      isSlow: true,
      keywordExpected: true,
      keywordFound: true,
      jsonAssertPath: true,
      jsonAssertExpected: true,
      jsonAssertFailed: true,
      httpSecurityChecks: true,
      httpSecurityCheckedAt: true,
      shopifyChecks: true,
      shopifyScannedAt: true,
      wpVersionStatus: true,
      wpSecurityChecks: true,
      wpScannedAt: true,
      contentHash: true,
      robotsTxtHash: true,
      robotsTxtBlocksAll: true,
      robotsTxtCheckedAt: true,
      dnsIps: true,
      dnsCheckedAt: true,
      escalationThresholdMinutes: true,
      escalationRecipients: true,
      downSince: true,
      webhookUrl: true,
      user: { select: { email: true, name: true } },
    },
  });

  // Load active maintenance windows for all monitors in one query
  const monitorIds = monitors.map((m) => m.id);
  const activeWindows = await prisma.maintenanceWindow.findMany({
    where: {
      monitorId: { in: monitorIds },
      startsAt: { lte: now },
      endsAt: { gte: now },
    },
    select: { monitorId: true },
  });
  const inMaintenance = new Set(activeWindows.map((w) => w.monitorId));

  const sharded =
    shardIndex !== undefined && totalShards !== undefined && totalShards > 1
      ? monitors.filter((m) => shardOf(m.id, totalShards) === shardIndex)
      : monitors;

  if (sharded.length === 0) return 0;

  console.log(`Checking ${sharded.length} monitor(s)${shardIndex !== undefined ? ` (shard ${shardIndex}/${totalShards})` : ""}...`);

  // Run all checks in parallel, collect MonitorCheck data from each
  const results = await Promise.allSettled(sharded.map((m) => checkMonitor(m, inMaintenance.has(m.id))));

  // Batch-insert all check records in one query instead of N individual INSERTs.
  // Works correctly with 1 or 0 results — createMany([single]) is a standard
  // INSERT with one VALUES row; createMany([]) is a no-op Prisma short-circuits.
  const checkRecords = results
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter((r): r is CheckRecord => r !== null);

  if (checkRecords.length > 0) {
    await prisma.monitorCheck.createMany({ data: checkRecords });
  }

  return sharded.length;
}

type CheckRecord = {
  monitorId: string;
  isUp: boolean;
  statusCode: number | null;
  responseTime: number | null;
  error: string | null;
};

type MonitorRow = {
  id: string;
  type: string;
  url: string | null;
  wpVersionStatus: string | null;
  wpSecurityChecks: unknown;
  wpScannedAt: Date | null;
  name: string;
  isUp: boolean;
  intervalMinutes: number;
  recipients: string[];
  sslEnabled: boolean;
  sslValid: boolean | null;
  domainDaysUntilExpiry: number | null;
  domainCheckedAt: Date | null;
  port: number | null;
  responseTimeThreshold: number | null;
  isSlow: boolean;
  keywordExpected: string | null;
  keywordFound: boolean | null;
  httpSecurityChecks: unknown;
  httpSecurityCheckedAt: Date | null;
  shopifyChecks: unknown;
  shopifyScannedAt: Date | null;
  contentHash: string | null;
  robotsTxtHash: string | null;
  robotsTxtBlocksAll: boolean | null;
  robotsTxtCheckedAt: Date | null;
  dnsIps: unknown;
  dnsCheckedAt: Date | null;
  escalationThresholdMinutes: number | null;
  escalationRecipients: string[];
  downSince: Date | null;
  webhookUrl: string | null;
  jsonAssertPath: string | null;
  jsonAssertExpected: string | null;
  jsonAssertFailed: boolean;
  user: { email: string; name: string | null };
};

async function checkMonitor(monitor: MonitorRow, maintenance: boolean): Promise<CheckRecord | null> {
  try {
    if (monitor.type === "DOMAIN") return await checkDomainMonitor(monitor, maintenance);
    if (monitor.type === "TCP") return await checkTcpMonitor(monitor, maintenance);
    if (monitor.type === "HEARTBEAT") return await checkHeartbeatMonitor(monitor, maintenance);
    if (monitor.type === "WORDPRESS") return await checkWordPressMonitor(monitor, maintenance);
    return await checkHttpMonitor(monitor, maintenance);
  } catch (err) {
    console.error(`[check] unhandled error for monitor ${monitor.id} (${monitor.name}):`, err);
    // Advance nextCheckAt so this monitor isn't re-queued on every cron tick.
    await prisma.monitor.update({
      where: { id: monitor.id },
      data: { nextCheckAt: new Date(Date.now() + monitor.intervalMinutes * 60 * 1000) },
    }).catch((e) => console.error(`[check] failed to advance nextCheckAt for ${monitor.id}:`, e));
    return null;
  }
}

// ─── HTTP ─────────────────────────────────────────────────────────────────────

function looksLikeWordPress(html: string): boolean {
  return (
    html.includes("/wp-content/") ||
    html.includes("/wp-includes/") ||
    /name="generator"\s+content="WordPress/i.test(html)
  );
}

async function checkHttpMonitor(monitor: MonitorRow, maintenance = false): Promise<CheckRecord> {
  if (!monitor.url) throw new Error("HTTP monitor has no URL");
  const start = Date.now();
  let isUp = false;
  let statusCode: number | null = null;
  let responseTime: number | null = null;
  let error: string | null = null;
  let html = "";
  let responseHeaders: Record<string, string> = {};
  let responseData: unknown = undefined;

  try {
    const response = await axios.get(monitor.url, {
      timeout: 10000,
      validateStatus: (s) => s < 500,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    });
    isUp = true;
    statusCode = response.status;
    responseTime = Date.now() - start;
    html = typeof response.data === "string" ? response.data : "";
    responseData = response.data;
    responseHeaders = response.headers as Record<string, string>;
  } catch (err) {
    isUp = false;
    error = err instanceof Error ? err.message : "Unknown error";
    responseTime = Date.now() - start;
  }

  const wasUp = monitor.isUp;
  const nextCheckAt = new Date(Date.now() + monitor.intervalMinutes * 60 * 1000);
  const domainDue =
    !monitor.domainCheckedAt ||
    Date.now() - monitor.domainCheckedAt.getTime() > 23 * 60 * 60 * 1000;
  const wpDue =
    isUp &&
    looksLikeWordPress(html) &&
    (!monitor.wpScannedAt ||
      Date.now() - monitor.wpScannedAt.getTime() > 23 * 60 * 60 * 1000);
  const shopifyDue =
    isUp &&
    looksLikeShopify(html, responseHeaders) &&
    (!monitor.shopifyScannedAt ||
      Date.now() - monitor.shopifyScannedAt.getTime() > 23 * 60 * 60 * 1000);

  // Keyword check — synchronous, uses already-fetched body
  const nowKeywordFound =
    isUp && monitor.keywordExpected ? html.includes(monitor.keywordExpected) : null;

  // JSON assertion — parse response JSON, navigate dot-path, compare to expected string
  let nowJsonAssertFailed: boolean | null = null;
  if (isUp && monitor.jsonAssertPath && monitor.jsonAssertExpected !== null) {
    try {
      const json = typeof responseData === "object" && responseData !== null ? responseData : JSON.parse(html);
      const actual = monitor.jsonAssertPath.split(".").reduce<unknown>((obj, key) => {
        return obj !== null && typeof obj === "object" ? (obj as Record<string, unknown>)[key] : undefined;
      }, json);
      nowJsonAssertFailed = String(actual) !== monitor.jsonAssertExpected;
    } catch {
      nowJsonAssertFailed = true;
    }
  }

  // Security headers check — synchronous, uses already-fetched headers, once per day
  const securityDue =
    !monitor.httpSecurityCheckedAt ||
    Date.now() - monitor.httpSecurityCheckedAt.getTime() > 23 * 60 * 60 * 1000;
  const securityResult: HttpSecurityChecks | null =
    isUp && securityDue
      ? checkHttpSecurity(responseHeaders, monitor.url.startsWith("https://"))
      : null;

  // Content hash — every check, only when up
  const newContentHash = isUp && html ? hashContent(html) : null;
  const contentChanged = !!(newContentHash && monitor.contentHash && newContentHash !== monitor.contentHash);

  const robotsDue =
    !monitor.robotsTxtCheckedAt ||
    Date.now() - monitor.robotsTxtCheckedAt.getTime() > 23 * 60 * 60 * 1000;
  const dnsDue =
    !monitor.dnsCheckedAt ||
    Date.now() - monitor.dnsCheckedAt.getTime() > 23 * 60 * 60 * 1000;

  const [sslResult, domainResult, wpResult, shopifyResult, robotsResult, dnsResult] = await Promise.all([
    monitor.sslEnabled && monitor.url.startsWith("https://")
      ? checkSsl(monitor.url)
      : Promise.resolve(null),
    domainDue ? checkDomain(monitor.url) : Promise.resolve(null),
    wpDue ? checkWordPress(monitor.url!) : Promise.resolve(null),
    shopifyDue ? checkShopify(monitor.url!, html) : Promise.resolve(null),
    isUp && robotsDue ? checkRobots(monitor.url!) : Promise.resolve(null),
    dnsDue ? checkDns(monitor.url!) : Promise.resolve(null),
  ]);

  const nowSlow =
    isUp &&
    monitor.responseTimeThreshold !== null &&
    responseTime !== null &&
    responseTime > monitor.responseTimeThreshold;

  await prisma.monitor.update({
    where: { id: monitor.id },
    data: {
      isUp,
      isSlow: isUp ? nowSlow : false,
      lastCheckedAt: new Date(),
      nextCheckAt,
      ...(sslResult !== null && {
        sslValid: sslResult.valid,
        sslExpiresAt: sslResult.expiresAt,
        sslDaysUntilExpiry: sslResult.daysUntilExpiry,
      }),
      ...(domainResult !== null && {
        domainExpiresAt: domainResult.expiresAt,
        domainDaysUntilExpiry: domainResult.daysUntilExpiry,
        domainCheckedAt: new Date(),
      }),
      ...(wpResult !== null && {
        wpVersion: wpResult.wpVersion,
        wpVersionStatus: wpResult.wpVersionStatus,
        wpLatestVersion: wpResult.wpLatestVersion,
        wpPlugins: wpResult.wpPlugins as object[],
        wpThemes: wpResult.wpThemes as object[],
        wpSecurityChecks: (wpResult.wpSecurityChecks as object) ?? undefined,
        wpInMaintenanceMode: wpResult.wpInMaintenanceMode,
        wpGaTrackingId: wpResult.wpGaTrackingId,
        wpGtmContainerId: wpResult.wpGtmContainerId,
        wpScannedAt: new Date(),
      }),
      ...(shopifyResult !== null && {
        shopifyChecks: shopifyResult as object,
        shopifyScannedAt: new Date(),
      }),
      ...(nowKeywordFound !== null && { keywordFound: nowKeywordFound }),
      ...(nowJsonAssertFailed !== null && { jsonAssertFailed: nowJsonAssertFailed }),
      ...(securityResult !== null && {
        httpSecurityChecks: securityResult as object,
        httpSecurityCheckedAt: new Date(),
      }),
      ...(newContentHash !== null && {
        contentHash: newContentHash,
        ...(contentChanged && { contentChangedAt: new Date() }),
      }),
      ...(robotsResult !== null && {
        robotsTxtHash: robotsResult.hash,
        robotsTxtBlocksAll: robotsResult.blocksAll,
        robotsTxtCheckedAt: new Date(),
      }),
      ...(dnsResult !== null && {
        dnsIps: dnsResult.ips,
        dnsCheckedAt: new Date(),
        ...(monitor.dnsIps !== null &&
          JSON.stringify((monitor.dnsIps as string[]).slice().sort()) !== JSON.stringify(dnsResult.ips)
            ? { dnsChangedAt: new Date() }
            : {}
        ),
      }),
    },
  });

  // Track downSince for escalation
  await prisma.monitor.update({
    where: { id: monitor.id },
    data: {
      ...(wasUp && !isUp ? { downSince: new Date() } : {}),
      ...(!wasUp && isUp ? { downSince: null } : {}),
    },
  });

  if (!maintenance) {
    if (wasUp && !isUp) {
      if (await canSendAlert(monitor.id, "DOWN")) {
        console.log(`DOWN: ${monitor.url}`);
        await sendDownAlert(monitor, error);
        await prisma.alert.create({ data: { monitorId: monitor.id, type: "DOWN" } });
      }
    } else if (!wasUp && isUp) {
      if (await canSendAlert(monitor.id, "RECOVERED")) {
        console.log(`RECOVERED: ${monitor.url}`);
        await sendRecoveryAlert(monitor);
        await prisma.alert.create({ data: { monitorId: monitor.id, type: "RECOVERED" } });
      }
    }

    if (monitor.responseTimeThreshold !== null && isUp && responseTime !== null) {
      const wasSlow = monitor.isSlow;
      if (!wasSlow && nowSlow) {
        if (await canSendAlert(monitor.id, "SLOW_RESPONSE")) {
          console.log(`SLOW: ${monitor.url} — ${responseTime}ms`);
          await sendSlowAlert(monitor, responseTime, monitor.responseTimeThreshold);
          await prisma.alert.create({ data: { monitorId: monitor.id, type: "SLOW_RESPONSE" } });
        }
      } else if (wasSlow && !nowSlow) {
        if (await canSendAlert(monitor.id, "SLOW_RECOVERED")) {
          console.log(`SPEED RECOVERED: ${monitor.url} — ${responseTime}ms`);
          await sendSlowRecoveredAlert(monitor, responseTime);
          await prisma.alert.create({ data: { monitorId: monitor.id, type: "SLOW_RECOVERED" } });
        }
      }
    }

    if (sslResult) await handleSslAlerts(monitor, sslResult);
    if (domainResult) await handleDomainExpiryAlerts(monitor, domainResult);
    if (wpResult) await fireWpAlerts(monitor, wpResult);
    if (shopifyResult) await fireShopifyAlerts(monitor, shopifyResult);

    if (contentChanged) {
      if (await canSendAlert(monitor.id, "CONTENT_CHANGED")) {
        console.log(`CONTENT CHANGED: ${monitor.url}`);
        await sendContentChangedAlert(monitor);
        await prisma.alert.create({ data: { monitorId: monitor.id, type: "CONTENT_CHANGED" } });
      }
    }

    if (robotsResult?.blocksAll && !monitor.robotsTxtBlocksAll) {
      if (await canSendAlert(monitor.id, "ROBOTS_BLOCKING")) {
        console.log(`ROBOTS BLOCKING: ${monitor.url}`);
        await sendRobotsBlockingAlert(monitor);
        await prisma.alert.create({ data: { monitorId: monitor.id, type: "ROBOTS_BLOCKING" } });
      }
    }

    if (dnsResult && monitor.dnsIps) {
      const prev = (monitor.dnsIps as string[]).sort().join(",");
      const curr = dnsResult.ips.join(",");
      if (prev !== curr) {
        if (await canSendAlert(monitor.id, "DNS_CHANGED")) {
          console.log(`DNS CHANGED: ${monitor.url} — ${prev} → ${curr}`);
          await sendDnsChangedAlert(monitor, monitor.dnsIps as string[], dnsResult.ips);
          await prisma.alert.create({ data: { monitorId: monitor.id, type: "DNS_CHANGED" } });
        }
      }
    }

    if (monitor.keywordExpected && nowKeywordFound !== null) {
      const wasFound = monitor.keywordFound;
      if (wasFound !== false && !nowKeywordFound) {
        if (await canSendAlert(monitor.id, "KEYWORD_MISSING")) {
          console.log(`KEYWORD MISSING: ${monitor.url} — "${monitor.keywordExpected}"`);
          await sendKeywordMissingAlert(monitor, monitor.keywordExpected);
          await prisma.alert.create({ data: { monitorId: monitor.id, type: "KEYWORD_MISSING" } });
        }
      } else if (wasFound === false && nowKeywordFound) {
        if (await canSendAlert(monitor.id, "KEYWORD_FOUND")) {
          console.log(`KEYWORD RESTORED: ${monitor.url} — "${monitor.keywordExpected}"`);
          await sendKeywordFoundAlert(monitor, monitor.keywordExpected);
          await prisma.alert.create({ data: { monitorId: monitor.id, type: "KEYWORD_FOUND" } });
        }
      }
    }

    if (monitor.jsonAssertPath && nowJsonAssertFailed !== null) {
      const wasFailed = monitor.jsonAssertFailed;
      if (!wasFailed && nowJsonAssertFailed) {
        if (await canSendAlert(monitor.id, "JSON_ASSERT_FAILED")) {
          console.log(`JSON ASSERT FAILED: ${monitor.url} — ${monitor.jsonAssertPath} !== "${monitor.jsonAssertExpected}"`);
          await sendJsonAssertFailedAlert(monitor, monitor.jsonAssertPath, monitor.jsonAssertExpected ?? "");
          await prisma.alert.create({ data: { monitorId: monitor.id, type: "JSON_ASSERT_FAILED" } });
        }
      } else if (wasFailed && !nowJsonAssertFailed) {
        if (await canSendAlert(monitor.id, "JSON_ASSERT_RECOVERED")) {
          console.log(`JSON ASSERT RECOVERED: ${monitor.url} — ${monitor.jsonAssertPath}`);
          await sendJsonAssertRecoveredAlert(monitor, monitor.jsonAssertPath);
          await prisma.alert.create({ data: { monitorId: monitor.id, type: "JSON_ASSERT_RECOVERED" } });
        }
      }
    }

    if (securityResult) await fireHttpSecurityAlerts(monitor, securityResult);

    // Escalation — fire if still down beyond threshold
    if (!isUp && monitor.escalationThresholdMinutes && monitor.escalationRecipients.length > 0) {
      const downSince = wasUp ? new Date() : monitor.downSince;
      if (downSince) {
        const minutesDown = (Date.now() - downSince.getTime()) / 60_000;
        if (minutesDown >= monitor.escalationThresholdMinutes) {
          if (await canSendAlert(monitor.id, "ESCALATION", 60 * 60 * 1000)) {
            console.log(`ESCALATION: ${monitor.url} — down ${Math.round(minutesDown)}m`);
            await sendEscalationAlert(monitor, Math.round(minutesDown));
            await prisma.alert.create({ data: { monitorId: monitor.id, type: "ESCALATION" } });
          }
        }
      }
    }
  } else {
    console.log(`[maintenance] skipping alerts for ${monitor.url}`);
  }

  return { monitorId: monitor.id, isUp, statusCode, responseTime, error };
}

// ─── Domain ───────────────────────────────────────────────────────────────────

async function checkDomainMonitor(monitor: MonitorRow, maintenance = false): Promise<CheckRecord> {
  if (!monitor.url) throw new Error("DOMAIN monitor has no URL");
  const result = await checkDomain(monitor.url);
  const nextCheckAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const wasUp = monitor.isUp;
  const isUp = result.valid;

  await prisma.monitor.update({
    where: { id: monitor.id },
    data: {
      isUp,
      lastCheckedAt: new Date(),
      nextCheckAt,
      domainExpiresAt: result.expiresAt,
      domainDaysUntilExpiry: result.daysUntilExpiry,
    },
  });

  if (!maintenance) {
    if (wasUp && !isUp) {
      if (await canSendAlert(monitor.id, "DOWN")) {
        console.log(`DOMAIN EXPIRED/INVALID: ${monitor.url}`);
        await sendDownAlert(monitor, result.error ?? "Domain may have expired");
        await prisma.alert.create({ data: { monitorId: monitor.id, type: "DOWN" } });
      }
    } else if (!wasUp && isUp) {
      if (await canSendAlert(monitor.id, "RECOVERED")) {
        console.log(`DOMAIN RECOVERED: ${monitor.url}`);
        await sendRecoveryAlert(monitor);
        await prisma.alert.create({ data: { monitorId: monitor.id, type: "RECOVERED" } });
      }
    }
    await handleDomainExpiryAlerts(monitor, result);
  }

  return { monitorId: monitor.id, isUp, statusCode: null, responseTime: null, error: result.error };
}

// ─── TCP ──────────────────────────────────────────────────────────────────────

async function checkTcpMonitor(monitor: MonitorRow, maintenance = false): Promise<CheckRecord | null> {
  if (!monitor.port) {
    console.warn(`TCP monitor ${monitor.id} has no port configured, skipping`);
    return null;
  }
  if (!monitor.url) throw new Error("TCP monitor has no URL");

  const result = await checkTcp(monitor.url, monitor.port);
  const wasUp = monitor.isUp;
  const nextCheckAt = new Date(Date.now() + monitor.intervalMinutes * 60 * 1000);
  const nowSlow =
    result.isUp &&
    monitor.responseTimeThreshold !== null &&
    result.responseTime !== null &&
    result.responseTime > monitor.responseTimeThreshold;

  await prisma.monitor.update({
    where: { id: monitor.id },
    data: { isUp: result.isUp, isSlow: result.isUp ? nowSlow : false, lastCheckedAt: new Date(), nextCheckAt },
  });

  if (!maintenance) {
    if (wasUp && !result.isUp) {
      if (await canSendAlert(monitor.id, "DOWN")) {
        console.log(`TCP DOWN: ${monitor.url}:${monitor.port}`);
        await sendDownAlert(monitor, result.error);
        await prisma.alert.create({ data: { monitorId: monitor.id, type: "DOWN" } });
      }
    } else if (!wasUp && result.isUp) {
      if (await canSendAlert(monitor.id, "RECOVERED")) {
        console.log(`TCP RECOVERED: ${monitor.url}:${monitor.port}`);
        await sendRecoveryAlert(monitor);
        await prisma.alert.create({ data: { monitorId: monitor.id, type: "RECOVERED" } });
      }
    }
    if (monitor.responseTimeThreshold !== null && result.isUp && result.responseTime !== null) {
      const wasSlow = monitor.isSlow;
      if (!wasSlow && nowSlow) {
        if (await canSendAlert(monitor.id, "SLOW_RESPONSE")) {
          await sendSlowAlert(monitor, result.responseTime, monitor.responseTimeThreshold);
          await prisma.alert.create({ data: { monitorId: monitor.id, type: "SLOW_RESPONSE" } });
        }
      } else if (wasSlow && !nowSlow) {
        if (await canSendAlert(monitor.id, "SLOW_RECOVERED")) {
          await sendSlowRecoveredAlert(monitor, result.responseTime);
          await prisma.alert.create({ data: { monitorId: monitor.id, type: "SLOW_RECOVERED" } });
        }
      }
    }
  }

  return { monitorId: monitor.id, isUp: result.isUp, statusCode: null, responseTime: result.responseTime, error: result.error };
}

// ─── Heartbeat ────────────────────────────────────────────────────────────────

async function checkHeartbeatMonitor(monitor: MonitorRow, maintenance = false): Promise<CheckRecord> {
  const wasUp = monitor.isUp;
  const nextCheckAt = new Date(Date.now() + monitor.intervalMinutes * 60 * 1000);

  await prisma.monitor.update({
    where: { id: monitor.id },
    data: { isUp: false, lastCheckedAt: new Date(), nextCheckAt },
  });

  if (!maintenance && wasUp && await canSendAlert(monitor.id, "DOWN")) {
    console.log(`HEARTBEAT MISSED: ${monitor.name}`);
    await sendDownAlert(monitor, "No heartbeat received within the expected interval");
    await prisma.alert.create({ data: { monitorId: monitor.id, type: "DOWN" } });
  }

  return { monitorId: monitor.id, isUp: false, statusCode: null, responseTime: null, error: "No heartbeat received" };
}

// ─── WordPress ────────────────────────────────────────────────────────────────

async function checkWordPressMonitor(monitor: MonitorRow, maintenance = false): Promise<CheckRecord> {
  if (!monitor.url) throw new Error("WORDPRESS monitor has no URL");

  const result = await checkWordPress(monitor.url);
  const nextCheckAt = new Date(Date.now() + monitor.intervalMinutes * 60 * 1000);
  const wasUp = monitor.isUp;

  await prisma.monitor.update({
    where: { id: monitor.id },
    data: {
      isUp: result.isUp,
      lastCheckedAt: new Date(),
      nextCheckAt,
      wpVersion: result.wpVersion,
      wpVersionStatus: result.wpVersionStatus,
      wpLatestVersion: result.wpLatestVersion,
      wpPlugins: result.wpPlugins as object[],
      wpThemes: result.wpThemes as object[],
      wpSecurityChecks: result.wpSecurityChecks as object ?? undefined,
      wpInMaintenanceMode: result.wpInMaintenanceMode,
      wpGaTrackingId: result.wpGaTrackingId,
      wpGtmContainerId: result.wpGtmContainerId,
      wpScannedAt: new Date(),
    },
  });

  if (!maintenance) {
    if (wasUp && !result.isUp) {
      if (await canSendAlert(monitor.id, "DOWN")) {
        await sendDownAlert(monitor, result.error);
        await prisma.alert.create({ data: { monitorId: monitor.id, type: "DOWN" } });
      }
    } else if (!wasUp && result.isUp) {
      if (await canSendAlert(monitor.id, "RECOVERED")) {
        await sendRecoveryAlert(monitor);
        await prisma.alert.create({ data: { monitorId: monitor.id, type: "RECOVERED" } });
      }
    }
    await fireWpAlerts(monitor, result);
  }

  return {
    monitorId: monitor.id,
    isUp: result.isUp,
    statusCode: result.statusCode,
    responseTime: result.responseTime,
    error: result.error,
  };
}

// ─── Shared WP alert helper ───────────────────────────────────────────────────

async function fireWpAlerts(
  monitor: MonitorRow,
  result: Awaited<ReturnType<typeof checkWordPress>>,
): Promise<void> {
  // Version alerts (only fire when status gets worse, not already alerted today)
  if (result.isUp && result.wpVersionStatus) {
    const prevStatus = monitor.wpVersionStatus;
    const nowWorse =
      (result.wpVersionStatus === "outdated_major" && prevStatus !== "outdated_major") ||
      // Fire on first detection (prevStatus null) and on escalation from current → minor
      (result.wpVersionStatus === "outdated_minor" && prevStatus !== "outdated_minor" && prevStatus !== "outdated_major");

    if (nowWorse) {
      const alertType =
        result.wpVersionStatus === "outdated_major" ? "WP_OUTDATED_MAJOR" : "WP_OUTDATED_MINOR";
      if (await canSendAlert(monitor.id, alertType)) {
        await sendWpOutdatedAlert(monitor, result.wpVersion!, result.wpLatestVersion!, result.wpVersionStatus);
        await prisma.alert.create({ data: { monitorId: monitor.id, type: alertType } });
      }
    }
  }

  // Security alerts — only fire for *newly detected* issues (delta vs previous stored state)
  if (result.isUp && result.wpSecurityChecks) {
    const curr = result.wpSecurityChecks;
    const prev = monitor.wpSecurityChecks as Record<string, boolean | string | null> | null;
    const newIssues: string[] = [];
    if (curr.xmlrpcEnabled && !prev?.xmlrpcEnabled)
      newIssues.push("XML-RPC is enabled");
    if (curr.loginPageExposed && !prev?.loginPageExposed)
      newIssues.push("Login page is publicly exposed");
    if (curr.directoryListingEnabled && !prev?.directoryListingEnabled)
      newIssues.push("Directory listing is enabled on /wp-content/uploads/");
    if (curr.defaultAdminUrl && !prev?.defaultAdminUrl)
      newIssues.push("Default /wp-admin URL is in use");
    if (curr.wpConfigExposed && !prev?.wpConfigExposed)
      newIssues.push("wp-config.php is publicly accessible (credentials exposed)");
    if (curr.debugModeEnabled && !prev?.debugModeEnabled)
      newIssues.push("WP_DEBUG is enabled — PHP errors are visible in the page source");
    if (curr.sslInvalid && !prev?.sslInvalid)
      newIssues.push("SSL certificate chain is incomplete — intermediate certificate not served by the server (browsers work around this, but some clients will reject the connection)");
    if (curr.userEnumerationEnabled && !prev?.userEnumerationEnabled)
      newIssues.push("User enumeration is possible — WordPress REST API or author archives expose login usernames");
    if (curr.debugLogExposed && !prev?.debugLogExposed)
      newIssues.push("wp-content/debug.log is publicly accessible — may contain file paths, database credentials, and stack traces");
    if (curr.installPhpAccessible && !prev?.installPhpAccessible)
      newIssues.push("wp-admin/install.php is accessible — the install wizard is reachable on a live site");
    if (curr.backupFilesExposed && !prev?.backupFilesExposed)
      newIssues.push("A backup file (e.g. backup.zip, db.sql) is publicly accessible in the web root — likely contains full database or source code");
    if (curr.outdatedPhp && !prev?.outdatedPhp)
      newIssues.push(`PHP version is end-of-life (${curr.detectedPhpVersion ?? "< 8.1"}) — upgrade to PHP 8.1 or later`);
    if (curr.missingHsts && !prev?.missingHsts)
      newIssues.push("Strict-Transport-Security (HSTS) header is missing — the site is vulnerable to SSL stripping attacks");
    if (curr.missingXFrameOptions && !prev?.missingXFrameOptions)
      newIssues.push("X-Frame-Options header is missing — the site may be vulnerable to clickjacking");
    if (curr.missingXContentTypeOptions && !prev?.missingXContentTypeOptions)
      newIssues.push("X-Content-Type-Options header is missing — browsers may MIME-sniff responses");
    if (curr.serverVersionDisclosed && !prev?.serverVersionDisclosed)
      newIssues.push(`Server version is disclosed in response headers (${curr.detectedServerHeader ?? "Server header"}) — remove version information to reduce attack surface`);

    if (newIssues.length > 0) {
      await sendWpSecurityAlert(monitor, newIssues);
      await prisma.alert.create({ data: { monitorId: monitor.id, type: "WP_SECURITY" } });
    }
  }
}

// ─── Alert helpers ────────────────────────────────────────────────────────────

async function fireShopifyAlerts(monitor: MonitorRow, curr: ShopifyChecks): Promise<void> {
  const prev = monitor.shopifyChecks as ShopifyChecks | null;

  // Password mode transitions — most critical alert
  if (curr.passwordModeEnabled && !prev?.passwordModeEnabled) {
    if (await canSendAlert(monitor.id, "SHOPIFY_PASSWORD_MODE")) {
      console.log(`SHOPIFY PASSWORD MODE ON: ${monitor.url}`);
      await sendShopifyPasswordModeAlert(monitor);
      await prisma.alert.create({ data: { monitorId: monitor.id, type: "SHOPIFY_PASSWORD_MODE" } });
    }
  } else if (!curr.passwordModeEnabled && prev?.passwordModeEnabled) {
    if (await canSendAlert(monitor.id, "SHOPIFY_PASSWORD_CLEARED")) {
      console.log(`SHOPIFY PASSWORD MODE OFF: ${monitor.url}`);
      await sendShopifyPasswordClearedAlert(monitor);
      await prisma.alert.create({ data: { monitorId: monitor.id, type: "SHOPIFY_PASSWORD_CLEARED" } });
    }
  }

  // Other newly detected issues
  const newIssues: string[] = [];
  if (curr.cartApiUp === false && prev?.cartApiUp !== false)
    newIssues.push("Cart API (/cart.js) is not responding — add-to-cart functionality may be broken");
  if (curr.maintenanceModeEnabled && !prev?.maintenanceModeEnabled)
    newIssues.push("Store appears to be in maintenance mode — customers may not be able to browse or purchase");

  if (newIssues.length > 0) {
    await sendShopifyIssueAlert(monitor, newIssues);
    await prisma.alert.create({ data: { monitorId: monitor.id, type: "SHOPIFY_ISSUE" } });
  }
}

async function fireHttpSecurityAlerts(monitor: MonitorRow, curr: HttpSecurityChecks): Promise<void> {
  const prev = monitor.httpSecurityChecks as HttpSecurityChecks | null;

  const newIssues: string[] = [];
  if (curr.missingHsts && !prev?.missingHsts)
    newIssues.push("Strict-Transport-Security (HSTS) header is missing — visitors can be downgraded from HTTPS to HTTP");
  if (curr.missingXFrameOptions && !prev?.missingXFrameOptions)
    newIssues.push("X-Frame-Options header is missing — the site may be vulnerable to clickjacking");
  if (curr.missingXContentTypeOptions && !prev?.missingXContentTypeOptions)
    newIssues.push("X-Content-Type-Options header is missing — browsers may MIME-sniff responses");
  if (curr.missingCsp && !prev?.missingCsp)
    newIssues.push("Content-Security-Policy (CSP) header is missing — no XSS mitigation policy is in place");
  if (curr.serverVersionDisclosed && !prev?.serverVersionDisclosed)
    newIssues.push(`Server version is disclosed in the Server header (${curr.detectedServerHeader ?? "Server"}) — remove version information to reduce attack surface`);
  if (curr.missingReferrerPolicy && !prev?.missingReferrerPolicy)
    newIssues.push("Referrer-Policy header is missing — the browser may leak the full URL to external sites");

  if (newIssues.length > 0) {
    await sendHttpSecurityAlert(monitor, newIssues);
    await prisma.alert.create({ data: { monitorId: monitor.id, type: "HTTP_SECURITY" } });
  }
}

async function handleSslAlerts(monitor: MonitorRow, sslResult: Awaited<ReturnType<typeof checkSsl>>) {
  const wasSslValid = monitor.sslValid;

  if (wasSslValid !== false && !sslResult.valid) {
    console.log(`SSL INVALID: ${monitor.url}`);
    await sendSslInvalidAlert(monitor, sslResult.error);
    await prisma.alert.create({ data: { monitorId: monitor.id, type: "SSL_INVALID" } });
    return;
  }

  if (sslResult.valid && sslResult.daysUntilExpiry !== null) {
    const windowStart = new Date(Date.now() - 23 * 60 * 60 * 1000);
    for (const threshold of SSL_THRESHOLDS) {
      if (sslResult.daysUntilExpiry <= threshold) {
        const alertType = `SSL_EXPIRY_${threshold}` as "SSL_EXPIRY_1" | "SSL_EXPIRY_7" | "SSL_EXPIRY_30";
        const recent = await prisma.alert.findFirst({
          where: { monitorId: monitor.id, type: alertType, sentAt: { gte: windowStart } },
        });
        if (!recent) {
          await sendSslExpiryAlert(monitor, sslResult.daysUntilExpiry, sslResult.expiresAt!);
          await prisma.alert.create({ data: { monitorId: monitor.id, type: alertType } });
        }
        break;
      }
    }
  }
}

async function handleDomainExpiryAlerts(monitor: MonitorRow, result: Awaited<ReturnType<typeof checkDomain>>) {
  if (!result.valid || result.daysUntilExpiry === null) return;

  const windowStart = new Date(Date.now() - 23 * 60 * 60 * 1000);

  for (const threshold of DOMAIN_THRESHOLDS) {
    if (result.daysUntilExpiry <= threshold) {
      const alertType = `DOMAIN_EXPIRY_${threshold}` as
        | "DOMAIN_EXPIRY_1"
        | "DOMAIN_EXPIRY_7"
        | "DOMAIN_EXPIRY_14"
        | "DOMAIN_EXPIRY_30";

      const recent = await prisma.alert.findFirst({
        where: { monitorId: monitor.id, type: alertType, sentAt: { gte: windowStart } },
      });

      if (!recent) {
        await sendDomainExpiryAlert(monitor, result.daysUntilExpiry, result.expiresAt!);
        await prisma.alert.create({ data: { monitorId: monitor.id, type: alertType } });
      }
      break;
    }
  }
}
