import { Resend } from "resend";
import { dispatchWebhook, type WebhookAlertType } from "@/lib/webhook";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? "alerts@upleus.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://upleus.com";

// Gmail (and most email clients) block data: URIs — use a hosted URL instead.
const LOGO_URL = `${APP_URL}/logo.png`;

interface Monitor {
  id: string;
  name: string;
  url: string | null;
  type?: string;
  port?: number | null;
  recipients: string[];
  webhookUrl?: string | null;
  user: { email: string; name: string | null };
}

function fireWebhook(
  monitor: Monitor,
  alertType: WebhookAlertType,
  details: Record<string, string | number | boolean | null> = {},
) {
  if (!monitor.webhookUrl) return;
  dispatchWebhook(monitor.webhookUrl, {
    alertType,
    timestamp: new Date().toISOString(),
    monitor: { id: monitor.id, name: monitor.name, url: monitor.url ?? "", type: monitor.type ?? "HTTP" },
    details,
  });
}

function allRecipients(monitor: Monitor): string[] {
  const all = [monitor.user.email, ...monitor.recipients];
  return [...new Set(all.map((e) => e.toLowerCase()))];
}

function esc(s: string | null): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(d: Date = new Date()): string {
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

function displayUrl(monitor: Monitor): string {
  if (monitor.type === "HEARTBEAT" || !monitor.url) return "";
  if (monitor.type === "TCP" && monitor.port) return `${monitor.url}:${monitor.port}`;
  return monitor.url;
}

function typeLabel(monitor: Monitor): string {
  switch (monitor.type) {
    case "TCP":        return "TCP Monitor";
    case "HEARTBEAT":  return "Heartbeat Monitor";
    case "DOMAIN":     return "Domain Monitor";
    case "WORDPRESS":  return "WordPress Monitor";
    default:           return "HTTP Monitor";
  }
}

// ─── Shell ────────────────────────────────────────────────────────────────────

function emailShell(innerRows: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Upleus alert</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
         style="background-color:#f1f5f9;padding:48px 16px">
    <tr><td align="center">
      <table cellpadding="0" cellspacing="0" role="presentation"
             style="width:100%;max-width:580px">

        <!-- Top accent bar -->
        <tr>
          <td bgcolor="#10b981"
              style="background-color:#10b981;height:4px;border-radius:12px 12px 0 0;font-size:0;line-height:0">
            &nbsp;
          </td>
        </tr>

        <!-- Logo header -->
        <tr>
          <td bgcolor="#ffffff"
              style="background-color:#ffffff;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;padding:22px 32px 20px">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="vertical-align:middle">
                  <img src="${LOGO_URL}" alt="Upleus" width="88" height="23"
                       style="display:block;height:23px;width:auto" />
                </td>
                <td align="right" style="vertical-align:middle">
                  <span style="color:#cbd5e1;font-size:11px;letter-spacing:0.3px;text-transform:uppercase;font-weight:600">
                    Uptime Monitoring
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        ${innerRows}

        <!-- Footer -->
        <tr>
          <td style="background-color:#f8fafc;border:1px solid #e2e8f0;border-top:none;
                     border-radius:0 0 12px 12px;padding:20px 32px;text-align:center">
            <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;line-height:1.6">
              You're receiving this because you set up monitoring on
              <a href="${APP_URL}" style="color:#64748b;text-decoration:none;font-weight:500">Upleus</a>.
            </p>
            <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6">
              <a href="${APP_URL}/dashboard" style="color:#64748b;text-decoration:none;font-weight:500">
                Manage alerts
              </a>
              &nbsp;&middot;&nbsp;
              <a href="${APP_URL}/dashboard" style="color:#64748b;text-decoration:none;font-weight:500">
                View all monitors
              </a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Shared primitives ────────────────────────────────────────────────────────

/**
 * Coloured status banner — the first content block after the logo header.
 *
 * @param bg            Background colour of the banner row
 * @param borderColor   Left + outer border colour
 * @param indicatorColor Colour of the status dot
 * @param headlineColor  Headline text colour
 * @param subtextColor   Muted subline text colour (explicit, never use opacity)
 * @param badgeText      Small uppercase badge above the headline (e.g. "DOWN ALERT")
 * @param badgeBg        Background colour of the badge pill
 * @param badgeColor     Text colour of the badge pill
 * @param headline       Main alert headline
 * @param subline        URL / domain / identifier shown below headline
 */
function banner(
  bg: string,
  borderColor: string,
  indicatorColor: string,
  headlineColor: string,
  subtextColor: string,
  badgeText: string,
  badgeBg: string,
  badgeColor: string,
  headline: string,
  subline: string,
): string {
  return `
    <tr>
      <td bgcolor="${bg}"
          style="background-color:${bg};border-left:1px solid ${borderColor};
                 border-right:1px solid ${borderColor};border-bottom:1px solid ${borderColor};
                 padding:28px 32px 24px">

        <!-- Badge -->
        <div style="margin-bottom:14px">
          <span style="display:inline-block;background-color:${badgeBg};color:${badgeColor};
                       font-size:10px;font-weight:700;letter-spacing:0.8px;
                       text-transform:uppercase;padding:4px 10px;border-radius:20px">
            ${badgeText}
          </span>
        </div>

        <!-- Status indicator + headline -->
        <table cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td style="padding-right:14px;vertical-align:top;padding-top:6px">
              <!-- Dot with halo ring -->
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td width="20" height="20"
                      bgcolor="${indicatorColor}"
                      style="width:20px;height:20px;border-radius:50%;
                             background-color:${indicatorColor};font-size:0;line-height:0">
                    &nbsp;
                  </td>
                </tr>
              </table>
            </td>
            <td>
              <p style="margin:0 0 8px;font-size:22px;font-weight:700;
                        color:${headlineColor};letter-spacing:-0.5px;line-height:1.2">
                ${headline}
              </p>
              ${subline
                ? `<p style="margin:0;font-size:13px;color:${subtextColor};
                             font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;
                             word-break:break-all;line-height:1.4">
                     ${subline}
                   </p>`
                : ""}
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function divider(): string {
  return `
    <tr>
      <td bgcolor="#ffffff"
          style="background-color:#ffffff;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;
                 padding:0 32px">
        <div style="height:1px;background-color:#f1f5f9;font-size:0;line-height:0">&nbsp;</div>
      </td>
    </tr>`;
}

function detailRow(label: string, value: string, mono = false): string {
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f8fafc;vertical-align:top;
                 padding-right:24px;width:120px">
        <span style="font-size:10px;font-weight:700;text-transform:uppercase;
                     letter-spacing:0.7px;color:#94a3b8">
          ${label}
        </span>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #f8fafc;vertical-align:top">
        <span style="font-size:14px;color:#0f172a;
                     ${mono ? "font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;" : ""}
                     line-height:1.5">
          ${value}
        </span>
      </td>
    </tr>`;
}

function bodySection(rows: string): string {
  return `
    <tr>
      <td bgcolor="#ffffff"
          style="background-color:#ffffff;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;
                 padding:24px 32px 8px">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          ${rows}
        </table>
      </td>
    </tr>`;
}

function ctaSection(text: string, url: string, color = "#0f172a"): string {
  return `
    <tr>
      <td bgcolor="#ffffff"
          style="background-color:#ffffff;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;
                 padding:20px 32px 28px">
        <a href="${url}"
           style="display:inline-block;background-color:${color};color:#ffffff;
                  padding:13px 28px;border-radius:10px;text-decoration:none;
                  font-size:14px;font-weight:600;letter-spacing:-0.2px;line-height:1">
          ${text} &rarr;
        </a>
      </td>
    </tr>`;
}

function noticeRow(text: string, bg: string, borderColor: string, textColor: string): string {
  return `
    <tr>
      <td bgcolor="${bg}"
          style="background-color:${bg};border-left:1px solid ${borderColor};
                 border-right:1px solid ${borderColor};border-bottom:1px solid ${borderColor};
                 padding:12px 32px">
        <p style="margin:0;font-size:13px;color:${textColor};font-weight:500;line-height:1.5">
          ${text}
        </p>
      </td>
    </tr>`;
}

// ─── Safe send wrapper ────────────────────────────────────────────────────────

async function sendEmail(payload: Parameters<typeof resend.emails.send>[0]): Promise<void> {
  try {
    const { error } = await resend.emails.send(payload);
    if (error) {
      console.error(`[alerter] Resend error sending "${payload.subject}" to ${payload.to}:`, error);
    }
  } catch (err) {
    console.error(`[alerter] Failed to send "${payload.subject}" to ${payload.to}:`, err);
  }
}

// ─── Alert send helper ────────────────────────────────────────────────────────

async function sendAlertEmail(
  monitor: Monitor,
  subject: string,
  inner: string,
  webhookType: WebhookAlertType,
  webhookDetails: Record<string, string | number | boolean | null> = {},
): Promise<void> {
  await sendEmail({
    from: FROM,
    to: allRecipients(monitor),
    subject,
    html: emailShell(inner),
  });
  fireWebhook(monitor, webhookType, webhookDetails);
}

// ─── Alert functions ──────────────────────────────────────────────────────────

export async function sendDownAlert(monitor: Monitor, error: string | null) {
  const url = displayUrl(monitor);
  const monitorUrl = `${APP_URL}/dashboard/monitors/${monitor.id}`;

  const inner =
    banner(
      "#fff1f2", "#fecdd3", "#f43f5e",
      "#881337", "#be123c",
      "Down alert", "#fecdd3", "#9f1239",
      `${esc(monitor.name)} is down`,
      esc(url),
    ) +
    bodySection(
      detailRow("Monitor", esc(monitor.name)) +
      detailRow("Type", typeLabel(monitor)) +
      detailRow("Status", '<span style="color:#e11d48;font-weight:600">Unreachable</span>') +
      (error ? detailRow("Error", `<span style="color:#64748b">${esc(error)}</span>`, true) : "") +
      detailRow("Detected", fmtDate()),
    ) +
    ctaSection("View monitor", monitorUrl, "#e11d48");

  await sendAlertEmail(monitor, `🔴 ${monitor.name} is down`, inner, "DOWN", { error: error ?? null });
}

export async function sendRecoveryAlert(monitor: Monitor) {
  const url = displayUrl(monitor);
  const monitorUrl = `${APP_URL}/dashboard/monitors/${monitor.id}`;

  const inner =
    banner(
      "#f0fdf4", "#bbf7d0", "#22c55e",
      "#14532d", "#15803d",
      "Recovery", "#bbf7d0", "#166534",
      `${esc(monitor.name)} is back up`,
      esc(url),
    ) +
    bodySection(
      detailRow("Monitor", esc(monitor.name)) +
      detailRow("Type", typeLabel(monitor)) +
      detailRow("Status", '<span style="color:#16a34a;font-weight:600">Operational</span>') +
      detailRow("Recovered", fmtDate()),
    ) +
    ctaSection("View monitor", monitorUrl, "#16a34a");

  await sendAlertEmail(monitor, `✅ ${monitor.name} is back up`, inner, "RECOVERED");
}

export async function sendSslExpiryAlert(
  monitor: Monitor,
  daysUntilExpiry: number,
  expiresAt: Date,
) {
  const monitorUrl = `${APP_URL}/dashboard/monitors/${monitor.id}`;
  const urgent = daysUntilExpiry <= 7;

  const label =
    daysUntilExpiry <= 0 ? "expires today" :
    daysUntilExpiry === 1 ? "expires in 1 day" :
    `expires in ${daysUntilExpiry} days`;

  const [bg, borderColor, indicatorColor, headlineColor, subtextColor, badgeBg, badgeColor, ctaColor] = urgent
    ? ["#fff1f2", "#fecdd3", "#f43f5e", "#881337", "#be123c", "#fecdd3", "#9f1239", "#e11d48"]
    : ["#fff7ed", "#fed7aa", "#f97316", "#7c2d12", "#9a3412", "#fed7aa", "#9a3412", "#ea580c"];

  const inner =
    banner(
      bg, borderColor, indicatorColor,
      headlineColor, subtextColor,
      urgent ? "SSL — Urgent" : "SSL Warning",
      badgeBg, badgeColor,
      `SSL certificate ${label}`,
      esc(monitor.url),
    ) +
    bodySection(
      detailRow("Monitor", esc(monitor.name)) +
      detailRow("Domain", esc(monitor.url), true) +
      detailRow("Days remaining", `<span style="color:${urgent ? "#e11d48" : "#ea580c"};font-weight:600">${daysUntilExpiry <= 0 ? "0 — expired" : `${daysUntilExpiry} days`}</span>`) +
      detailRow("Expires", fmtDate(expiresAt)) +
      detailRow("Action", "Renew your SSL certificate to avoid browser security warnings and potential downtime."),
    ) +
    ctaSection("View monitor", monitorUrl, ctaColor);

  await sendAlertEmail(monitor, `⚠️ SSL certificate for ${monitor.name} ${label}`, inner, "SSL_EXPIRY", { daysUntilExpiry, expiresAt: expiresAt.toISOString() });
}

export async function sendDomainExpiryAlert(
  monitor: Monitor,
  daysUntilExpiry: number,
  expiresAt: Date,
) {
  const monitorUrl = `${APP_URL}/dashboard/monitors/${monitor.id}`;
  const urgent = daysUntilExpiry <= 7;

  const label =
    daysUntilExpiry <= 0 ? "has expired" :
    daysUntilExpiry === 1 ? "expires tomorrow" :
    `expires in ${daysUntilExpiry} days`;

  const [bg, borderColor, indicatorColor, headlineColor, subtextColor, badgeBg, badgeColor, ctaColor] = urgent
    ? ["#fff1f2", "#fecdd3", "#f43f5e", "#881337", "#be123c", "#fecdd3", "#9f1239", "#e11d48"]
    : ["#fff7ed", "#fed7aa", "#f97316", "#7c2d12", "#9a3412", "#fed7aa", "#9a3412", "#ea580c"];

  const inner =
    banner(
      bg, borderColor, indicatorColor,
      headlineColor, subtextColor,
      urgent ? "Domain — Urgent" : "Domain Warning",
      badgeBg, badgeColor,
      `Domain ${label}`,
      esc(monitor.url),
    ) +
    bodySection(
      detailRow("Monitor", esc(monitor.name)) +
      detailRow("Domain", esc(monitor.url), true) +
      detailRow("Days remaining", `<span style="color:${urgent ? "#e11d48" : "#ea580c"};font-weight:600">${daysUntilExpiry <= 0 ? "0 — expired" : `${daysUntilExpiry} days`}</span>`) +
      detailRow("Expires", fmtDate(expiresAt)) +
      detailRow("Action", "Renew your domain registration to avoid losing it and causing downtime."),
    ) +
    ctaSection("View monitor", monitorUrl, ctaColor);

  await sendAlertEmail(monitor, `⚠️ Domain ${monitor.name} ${label}`, inner, "DOMAIN_EXPIRY", { daysUntilExpiry, expiresAt: expiresAt.toISOString() });
}

export async function sendSslInvalidAlert(monitor: Monitor, error: string | null) {
  const monitorUrl = `${APP_URL}/dashboard/monitors/${monitor.id}`;

  const inner =
    banner(
      "#fff1f2", "#fecdd3", "#f43f5e",
      "#881337", "#be123c",
      "SSL — Certificate Invalid", "#fecdd3", "#9f1239",
      `SSL certificate problem on ${esc(monitor.name)}`,
      esc(monitor.url),
    ) +
    bodySection(
      detailRow("Monitor", esc(monitor.name)) +
      detailRow("Domain", esc(monitor.url), true) +
      detailRow("Status", '<span style="color:#e11d48;font-weight:600">Certificate invalid</span>') +
      (error ? detailRow("Error", `<span style="color:#64748b">${esc(error)}</span>`, true) : "") +
      detailRow("Impact", "Visitors will see a browser security warning until this is resolved.") +
      detailRow("Detected", fmtDate()),
    ) +
    ctaSection("View monitor", monitorUrl, "#e11d48");

  await sendAlertEmail(monitor, `🔴 SSL certificate issue on ${monitor.name}`, inner, "SSL_INVALID", { error: error ?? null });
}

export async function sendSlowAlert(
  monitor: Monitor,
  responseTime: number,
  threshold: number,
) {
  const url = displayUrl(monitor);
  const monitorUrl = `${APP_URL}/dashboard/monitors/${monitor.id}`;

  const inner =
    banner(
      "#fefce8", "#fef08a", "#eab308",
      "#713f12", "#854d0e",
      "Performance alert", "#fef08a", "#713f12",
      `${esc(monitor.name)} is responding slowly`,
      esc(url),
    ) +
    bodySection(
      detailRow("Monitor", esc(monitor.name)) +
      detailRow("Type", typeLabel(monitor)) +
      detailRow("Response time", `<span style="color:#ca8a04;font-weight:600">${responseTime} ms</span>`) +
      detailRow("Your threshold", `${threshold} ms`) +
      detailRow("Status", '<span style="color:#16a34a;font-weight:600">Still reachable</span>') +
      detailRow("Detected", fmtDate()),
    ) +
    ctaSection("View monitor", monitorUrl, "#ca8a04");

  await sendAlertEmail(monitor, `⚠️ ${monitor.name} is responding slowly (${responseTime}ms)`, inner, "SLOW_RESPONSE", { responseTime, threshold });
}

export async function sendSlowRecoveredAlert(
  monitor: Monitor,
  responseTime: number,
) {
  const url = displayUrl(monitor);
  const monitorUrl = `${APP_URL}/dashboard/monitors/${monitor.id}`;

  const inner =
    banner(
      "#f0fdf4", "#bbf7d0", "#22c55e",
      "#14532d", "#15803d",
      "Performance — Recovered", "#bbf7d0", "#166534",
      `${esc(monitor.name)} response time is back to normal`,
      esc(url),
    ) +
    bodySection(
      detailRow("Monitor", esc(monitor.name)) +
      detailRow("Type", typeLabel(monitor)) +
      detailRow("Response time", `<span style="color:#16a34a;font-weight:600">${responseTime} ms</span>`) +
      detailRow("Recovered", fmtDate()),
    ) +
    ctaSection("View monitor", monitorUrl, "#16a34a");

  await sendAlertEmail(monitor, `✅ ${monitor.name} response time back to normal`, inner, "SLOW_RECOVERED", { responseTime });
}

export interface MonthlyMonitorStats {
  id: string;
  name: string;
  url: string | null;
  type: string;
  port: number | null;
  totalChecks: number;
  upChecks: number;
  incidentCount: number;
  avgResponseTime: number | null;
}

export async function sendMonthlyReport(
  user: { email: string; name: string | null },
  stats: MonthlyMonitorStats[],
  month: string, // e.g. "March 2026"
): Promise<void> {
  if (stats.length === 0) return;

  const overallUp = stats.reduce((s, m) => s + m.upChecks, 0);
  const overallTotal = stats.reduce((s, m) => s + m.totalChecks, 0);
  const overallUptime = overallTotal > 0 ? ((overallUp / overallTotal) * 100).toFixed(2) : null;
  const totalIncidents = stats.reduce((s, m) => s + m.incidentCount, 0);

  function uptimeColor(pct: number): string {
    if (pct >= 99) return "#16a34a";
    if (pct >= 95) return "#ca8a04";
    return "#e11d48";
  }

  function monitorDisplayUrl(m: MonthlyMonitorStats): string {
    if (m.type === "HEARTBEAT") return "";
    if (m.type === "TCP" && m.port) return `${m.url ?? ""}:${m.port}`;
    return m.url ?? "";
  }

  const monitorRows = stats.map((m) => {
    const uptimePct = m.totalChecks > 0 ? (m.upChecks / m.totalChecks) * 100 : null;
    const uptimeStr = uptimePct !== null ? `${uptimePct.toFixed(2)}%` : "—";
    const color = uptimePct !== null ? uptimeColor(uptimePct) : "#94a3b8";
    const dUrl = monitorDisplayUrl(m);
    return `
      <tr style="border-bottom:1px solid #f1f5f9">
        <td style="padding:12px 8px 12px 0;vertical-align:top">
          <span style="font-size:13px;font-weight:600;color:#0f172a;display:block">${esc(m.name)}</span>
          ${dUrl ? `<span style="font-size:11px;color:#94a3b8;font-family:'SFMono-Regular',Consolas,monospace">${esc(dUrl)}</span>` : ""}
        </td>
        <td style="padding:12px 8px;vertical-align:top;text-align:center;white-space:nowrap">
          <span style="font-size:14px;font-weight:700;color:${color}">${uptimeStr}</span>
        </td>
        <td style="padding:12px 8px;vertical-align:top;text-align:center">
          <span style="font-size:14px;font-weight:600;color:${m.incidentCount > 0 ? "#e11d48" : "#16a34a"}">${m.incidentCount}</span>
        </td>
        <td style="padding:12px 0 12px 8px;vertical-align:top;text-align:right;white-space:nowrap">
          <span style="font-size:13px;color:#475569">${m.avgResponseTime !== null ? `${m.avgResponseTime} ms` : "—"}</span>
        </td>
      </tr>`;
  }).join("");

  const greeting = user.name ? `Hi ${esc(user.name)},` : "Hi there,";

  const inner = `
    <!-- Header banner -->
    <tr>
      <td bgcolor="#f0fdf4"
          style="background-color:#f0fdf4;border-left:1px solid #bbf7d0;
                 border-right:1px solid #bbf7d0;border-bottom:1px solid #bbf7d0;
                 padding:28px 32px 24px">
        <div style="margin-bottom:10px">
          <span style="display:inline-block;background-color:#bbf7d0;color:#166534;
                       font-size:10px;font-weight:700;letter-spacing:0.8px;
                       text-transform:uppercase;padding:4px 10px;border-radius:20px">
            Monthly Report — ${esc(month)}
          </span>
        </div>
        <p style="margin:0 0 4px;font-size:20px;font-weight:700;color:#14532d;letter-spacing:-0.5px">
          Your uptime report is ready
        </p>
        <p style="margin:0;font-size:14px;color:#15803d">${greeting} Here's how your monitors performed in ${esc(month)}.</p>
      </td>
    </tr>

    <!-- Overall stats -->
    <tr>
      <td bgcolor="#ffffff"
          style="background-color:#ffffff;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;
                 padding:24px 32px">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td width="33%" style="padding-right:8px">
              <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;text-align:center">
                <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:0.7px;text-transform:uppercase;color:#94a3b8">Overall uptime</p>
                <p style="margin:0;font-size:24px;font-weight:800;color:${overallUptime !== null ? uptimeColor(parseFloat(overallUptime)) : "#94a3b8"}">${overallUptime !== null ? `${overallUptime}%` : "—"}</p>
              </div>
            </td>
            <td width="33%" style="padding:0 4px">
              <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;text-align:center">
                <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:0.7px;text-transform:uppercase;color:#94a3b8">Monitors</p>
                <p style="margin:0;font-size:24px;font-weight:800;color:#0f172a">${stats.length}</p>
              </div>
            </td>
            <td width="33%" style="padding-left:8px">
              <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;text-align:center">
                <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:0.7px;text-transform:uppercase;color:#94a3b8">Incidents</p>
                <p style="margin:0;font-size:24px;font-weight:800;color:${totalIncidents > 0 ? "#e11d48" : "#16a34a"}">${totalIncidents}</p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Per-monitor table -->
    <tr>
      <td bgcolor="#ffffff"
          style="background-color:#ffffff;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;
                 padding:0 32px 24px">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <!-- Table header -->
          <tr style="border-bottom:2px solid #e2e8f0">
            <th style="text-align:left;padding:0 8px 8px 0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:#94a3b8">Monitor</th>
            <th style="text-align:center;padding:0 8px 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:#94a3b8">Uptime</th>
            <th style="text-align:center;padding:0 8px 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:#94a3b8">Incidents</th>
            <th style="text-align:right;padding:0 0 8px 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:#94a3b8">Avg resp.</th>
          </tr>
          ${monitorRows}
        </table>
      </td>
    </tr>

    ${ctaSection("View all monitors", `${APP_URL}/dashboard`, "#10b981")}
  `;

  await sendEmail({
    from: FROM,
    to: [user.email],
    subject: `📊 Your Upleus monthly report — ${month}`,
    html: emailShell(inner),
  });
}

export async function sendTestAlert(
  monitor: Monitor,
  recipientEmail: string,
) {
  const url = displayUrl(monitor);
  const monitorUrl = `${APP_URL}/dashboard/monitors/${monitor.id}`;

  const inner =
    noticeRow(
      "&#9888;&nbsp; This is a <strong>test alert</strong> &mdash; your monitor is fine. No action needed.",
      "#fefce8", "#fef08a", "#854d0e",
    ) +
    banner(
      "#fff1f2", "#fecdd3", "#f43f5e",
      "#881337", "#be123c",
      "Simulated — Down alert", "#fecdd3", "#9f1239",
      `${esc(monitor.name)} is down`,
      esc(url),
    ) +
    bodySection(
      detailRow("Monitor", esc(monitor.name)) +
      detailRow("Type", typeLabel(monitor)) +
      detailRow("Status", '<span style="color:#e11d48;font-weight:600">Unreachable (simulated)</span>') +
      detailRow("Error", '<span style="color:#64748b">Connection timed out (simulated)</span>', true) +
      detailRow("Detected", fmtDate()),
    ) +
    ctaSection("View monitor", monitorUrl);

  await sendEmail({
    from: FROM,
    to: [recipientEmail],
    subject: `[TEST] 🔴 ${monitor.name} is down`,
    html: emailShell(inner),
  });
}

// ─── WordPress alerts ─────────────────────────────────────────────────────────

export async function sendWpOutdatedAlert(
  monitor: Monitor,
  currentVersion: string,
  latestVersion: string,
  status: string,
) {
  const monitorUrl = `${APP_URL}/dashboard/monitors/${monitor.id}`;
  const isMajor = status === "outdated_major";

  const [bg, borderColor, indicatorColor, headlineColor, subtextColor, badgeBg, badgeColor, ctaColor] = isMajor
    ? ["#fff1f2", "#fecdd3", "#f43f5e", "#881337", "#be123c", "#fecdd3", "#9f1239", "#e11d48"]
    : ["#fff7ed", "#fed7aa", "#f97316", "#7c2d12", "#9a3412", "#fed7aa", "#9a3412", "#ea580c"];

  const inner =
    banner(
      bg, borderColor, indicatorColor,
      headlineColor, subtextColor,
      isMajor ? "WordPress — Major Update Required" : "WordPress — Update Available",
      badgeBg, badgeColor,
      isMajor
        ? `WordPress core is a major version behind on ${esc(monitor.name)}`
        : `WordPress core update available on ${esc(monitor.name)}`,
      esc(monitor.url),
    ) +
    bodySection(
      detailRow("Monitor", esc(monitor.name)) +
      detailRow("Site", esc(monitor.url), true) +
      detailRow("Installed version", `<span style="color:${isMajor ? "#e11d48" : "#ea580c"};font-weight:600">${esc(currentVersion)}</span>`) +
      detailRow("Latest version", `<span style="font-weight:600">${esc(latestVersion)}</span>`) +
      detailRow("Action", isMajor
        ? `Your site is running WordPress ${esc(currentVersion)}, which is a major version behind ${esc(latestVersion)}. Major releases include critical security patches — update as soon as possible.`
        : `A minor update is available (${esc(currentVersion)} → ${esc(latestVersion)}). Update to receive the latest security patches and bug fixes.`),
    ) +
    ctaSection("View monitor", monitorUrl, ctaColor);

  const subject = isMajor
    ? `🔴 WordPress major update required — ${monitor.name} (${currentVersion} → ${latestVersion})`
    : `⚠️ WordPress update available — ${monitor.name} (${currentVersion} → ${latestVersion})`;

  await sendAlertEmail(
    monitor,
    subject,
    inner,
    "WP_OUTDATED",
    { currentVersion, latestVersion, status },
  );
}

// ─── Shopify alerts ────────────────────────────────────────────────────────────

export async function sendShopifyPasswordModeAlert(monitor: Monitor) {
  const url = displayUrl(monitor);
  const monitorUrl = `${APP_URL}/dashboard/monitors/${monitor.id}`;

  const inner =
    banner(
      "#fff1f2", "#fecdd3", "#f43f5e",
      "#881337", "#be123c",
      "Shopify — Store Locked", "#fecdd3", "#9f1239",
      `${esc(monitor.name)} is in password mode`,
      esc(url),
    ) +
    bodySection(
      detailRow("Monitor", esc(monitor.name)) +
      detailRow("Store", esc(url), true) +
      detailRow("What this means", "The store is showing a password page — customers cannot browse or purchase until password mode is disabled.") +
      detailRow("Action", "Log in to your Shopify admin and disable the storefront password under Online Store → Preferences.") +
      detailRow("Detected", fmtDate()),
    ) +
    ctaSection("View monitor", monitorUrl, "#e11d48");

  await sendAlertEmail(
    monitor,
    `🔴 Shopify store locked — ${monitor.name}`,
    inner,
    "SHOPIFY_PASSWORD_MODE",
    { url },
  );
}

export async function sendShopifyPasswordClearedAlert(monitor: Monitor) {
  const url = displayUrl(monitor);
  const monitorUrl = `${APP_URL}/dashboard/monitors/${monitor.id}`;

  const inner =
    banner(
      "#f0fdf4", "#bbf7d0", "#22c55e",
      "#14532d", "#15803d",
      "Shopify — Store Unlocked", "#bbf7d0", "#166534",
      `${esc(monitor.name)} is open again`,
      esc(url),
    ) +
    bodySection(
      detailRow("Monitor", esc(monitor.name)) +
      detailRow("Store", esc(url), true) +
      detailRow("Status", '<span style="color:#16a34a;font-weight:600">Password mode has been disabled — the store is publicly accessible</span>') +
      detailRow("Resolved", fmtDate()),
    ) +
    ctaSection("View monitor", monitorUrl, "#16a34a");

  await sendAlertEmail(
    monitor,
    `✅ Shopify store unlocked — ${monitor.name}`,
    inner,
    "SHOPIFY_PASSWORD_CLEARED",
    { url },
  );
}

export async function sendShopifyIssueAlert(monitor: Monitor, issues: string[]) {
  const url = displayUrl(monitor);
  const monitorUrl = `${APP_URL}/dashboard/monitors/${monitor.id}`;

  const issueRows = issues
    .map((issue) => detailRow("Issue", `<span style="color:#b45309;font-weight:500">${esc(issue)}</span>`, true))
    .join("");

  const inner =
    banner(
      "#fff7ed", "#fed7aa", "#f97316",
      "#7c2d12", "#9a3412",
      "Shopify — Store Issue", "#fed7aa", "#9a3412",
      `Issues detected on ${esc(monitor.name)}`,
      esc(url),
    ) +
    bodySection(
      detailRow("Monitor", esc(monitor.name)) +
      detailRow("Store", esc(url), true) +
      issueRows +
      detailRow("Action", "Review your Shopify store and any recently installed or updated apps that may have caused this."),
    ) +
    ctaSection("View monitor", monitorUrl, "#ea580c");

  await sendAlertEmail(
    monitor,
    `⚠️ Shopify store issues — ${monitor.name}`,
    inner,
    "SHOPIFY_ISSUE",
    { issueCount: issues.length, issues: issues.join(", ") },
  );
}

// ─── HTTP enhancements ─────────────────────────────────────────────────────────

export async function sendKeywordMissingAlert(monitor: Monitor, keyword: string) {
  const url = displayUrl(monitor);
  const monitorUrl = `${APP_URL}/dashboard/monitors/${monitor.id}`;

  const inner =
    banner(
      "#fff1f2", "#fecdd3", "#f43f5e",
      "#881337", "#be123c",
      "Keyword missing", "#fecdd3", "#9f1239",
      `Expected keyword not found on ${esc(monitor.name)}`,
      esc(url),
    ) +
    bodySection(
      detailRow("Monitor", esc(monitor.name)) +
      detailRow("URL", esc(url), true) +
      detailRow("Keyword", `<span style="font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;background:#fee2e2;padding:2px 6px;border-radius:4px">${esc(keyword)}</span>`) +
      detailRow("What this means", "The page loaded successfully but the expected text is no longer present. This may indicate a broken deployment, CMS error, or content change.") +
      detailRow("Detected", fmtDate()),
    ) +
    ctaSection("View monitor", monitorUrl, "#e11d48");

  await sendAlertEmail(
    monitor,
    `🔴 Keyword missing — ${monitor.name}`,
    inner,
    "KEYWORD_MISSING",
    { keyword },
  );
}

export async function sendKeywordFoundAlert(monitor: Monitor, keyword: string) {
  const url = displayUrl(monitor);
  const monitorUrl = `${APP_URL}/dashboard/monitors/${monitor.id}`;

  const inner =
    banner(
      "#f0fdf4", "#bbf7d0", "#22c55e",
      "#14532d", "#15803d",
      "Keyword restored", "#bbf7d0", "#166534",
      `Expected keyword is back on ${esc(monitor.name)}`,
      esc(url),
    ) +
    bodySection(
      detailRow("Monitor", esc(monitor.name)) +
      detailRow("URL", esc(url), true) +
      detailRow("Keyword", `<span style="font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;background:#dcfce7;padding:2px 6px;border-radius:4px">${esc(keyword)}</span>`) +
      detailRow("Resolved", fmtDate()),
    ) +
    ctaSection("View monitor", monitorUrl, "#16a34a");

  await sendAlertEmail(
    monitor,
    `✅ Keyword restored — ${monitor.name}`,
    inner,
    "KEYWORD_FOUND",
    { keyword },
  );
}

export async function sendHttpSecurityAlert(monitor: Monitor, issues: string[]) {
  const url = displayUrl(monitor);
  const monitorUrl = `${APP_URL}/dashboard/monitors/${monitor.id}`;

  const issueRows = issues
    .map((issue) => detailRow("Issue", `<span style="color:#b45309;font-weight:500">${esc(issue)}</span>`, true))
    .join("");

  const inner =
    banner(
      "#fff7ed", "#fed7aa", "#f97316",
      "#7c2d12", "#9a3412",
      "Security headers", "#fed7aa", "#9a3412",
      `Security header issues detected on ${esc(monitor.name)}`,
      esc(url),
    ) +
    bodySection(
      detailRow("Monitor", esc(monitor.name)) +
      detailRow("URL", esc(url), true) +
      issueRows +
      detailRow("Action", "Add the missing response headers to your web server or CDN configuration to improve security posture."),
    ) +
    ctaSection("View monitor", monitorUrl, "#ea580c");

  await sendAlertEmail(
    monitor,
    `⚠️ Security header issues on ${monitor.name}`,
    inner,
    "HTTP_SECURITY",
    { issueCount: issues.length, issues: issues.join(", ") },
  );
}

export async function sendWpSecurityAlert(monitor: Monitor, issues: string[]) {
  const monitorUrl = `${APP_URL}/dashboard/monitors/${monitor.id}`;

  const issueRows = issues
    .map((issue) => detailRow("Issue", `<span style="color:#b45309;font-weight:500">${esc(issue)}</span>`, true))
    .join("");

  const inner =
    banner(
      "#fff7ed", "#fed7aa", "#f97316",
      "#7c2d12", "#9a3412",
      "WordPress — Security", "#fed7aa", "#9a3412",
      `Security issues detected on ${esc(monitor.name)}`,
      esc(monitor.url),
    ) +
    bodySection(
      detailRow("Monitor", esc(monitor.name)) +
      detailRow("Site", esc(monitor.url), true) +
      issueRows +
      detailRow("Action", "Review and resolve these misconfigurations to reduce your attack surface."),
    ) +
    ctaSection("View monitor", monitorUrl, "#ea580c");

  await sendAlertEmail(
    monitor,
    `⚠️ WordPress security issues on ${monitor.name}`,
    inner,
    "WP_SECURITY",
    { issueCount: issues.length, issues: issues.join(", ") },
  );
}

export async function sendContentChangedAlert(monitor: Monitor) {
  const monitorUrl = `${APP_URL}/dashboard/monitors/${monitor.id}`;
  const inner =
    banner(
      "#eff6ff", "#bfdbfe", "#3b82f6",
      "#1e3a8a", "#1d4ed8",
      "Content Change", "#bfdbfe", "#1e40af",
      `Page content changed on ${esc(monitor.name)}`,
      esc(monitor.url),
    ) +
    bodySection(
      detailRow("Monitor", esc(monitor.name)) +
      detailRow("URL", esc(monitor.url), true) +
      detailRow("Action", "Verify the change was intentional. If unexpected, check for defacement, accidental deploys, or CMS issues."),
    ) +
    ctaSection("View monitor", monitorUrl, "#2563eb");

  await sendAlertEmail(monitor, `🔄 Content changed on ${monitor.name}`, inner, "CONTENT_CHANGED");
}

export async function sendRobotsBlockingAlert(monitor: Monitor) {
  const monitorUrl = `${APP_URL}/dashboard/monitors/${monitor.id}`;
  const inner =
    banner(
      "#fff1f2", "#fecdd3", "#f43f5e",
      "#881337", "#be123c",
      "SEO — Critical", "#fecdd3", "#9f1239",
      `robots.txt is blocking all search engines on ${esc(monitor.name)}`,
      esc(monitor.url),
    ) +
    bodySection(
      detailRow("Monitor", esc(monitor.name)) +
      detailRow("URL", esc(monitor.url), true) +
      detailRow("Issue", "<span style=\"color:#be123c;font-weight:500\">Disallow: / found for User-agent: *</span>", true) +
      detailRow("Action", "Open robots.txt and remove or update the Disallow: / directive immediately to prevent search engine deindexing."),
    ) +
    ctaSection("View monitor", monitorUrl, "#e11d48");

  await sendAlertEmail(monitor, `🚨 robots.txt blocking all crawlers on ${monitor.name}`, inner, "ROBOTS_BLOCKING");
}

export async function sendDnsChangedAlert(monitor: Monitor, prevIps: string[], newIps: string[]) {
  const monitorUrl = `${APP_URL}/dashboard/monitors/${monitor.id}`;
  const inner =
    banner(
      "#fff7ed", "#fed7aa", "#f97316",
      "#7c2d12", "#9a3412",
      "DNS Change", "#fed7aa", "#9a3412",
      `DNS records changed for ${esc(monitor.name)}`,
      esc(monitor.url),
    ) +
    bodySection(
      detailRow("Monitor", esc(monitor.name)) +
      detailRow("URL", esc(monitor.url), true) +
      detailRow("Previous IPs", esc(prevIps.join(", ")), true) +
      detailRow("New IPs", `<span style="color:#c2410c;font-weight:500">${esc(newIps.join(", "))}</span>`, true) +
      detailRow("Action", "Verify this DNS change was planned. If unexpected, investigate potential hijacking or misconfigured DNS records."),
    ) +
    ctaSection("View monitor", monitorUrl, "#ea580c");

  await sendAlertEmail(
    monitor,
    `⚠️ DNS change detected on ${monitor.name}`,
    inner,
    "DNS_CHANGED",
    { previousIps: prevIps.join(", "), newIps: newIps.join(", ") },
  );
}

export async function sendEscalationAlert(monitor: Monitor & { escalationRecipients?: string[] }, minutesDown: number) {
  const inner =
    banner(
      "#fff1f2", "#fecdd3", "#f43f5e",
      "#881337", "#be123c",
      "Escalation", "#fecdd3", "#9f1239",
      `${esc(monitor.name)} has been down for ${minutesDown} minutes`,
      esc(monitor.url),
    ) +
    bodySection(
      detailRow("Monitor", esc(monitor.name)) +
      detailRow("URL", esc(monitor.url), true) +
      detailRow("Down for", `<span style="color:#be123c;font-weight:600">${minutesDown} minutes</span>`, true) +
      detailRow("Action", "This is an escalation alert. The site has been down longer than the configured threshold — immediate attention required."),
    ) +
    ctaSection("View monitor", `${APP_URL}/dashboard/monitors/${monitor.id}`, "#e11d48");

  const extendedMonitor = {
    ...monitor,
    recipients: [...new Set([...monitor.recipients, ...(monitor.escalationRecipients ?? [])])],
  };

  await sendAlertEmail(extendedMonitor, `🚨 Escalation — ${monitor.name} down ${minutesDown}m`, inner, "ESCALATION", { minutesDown });
}

export async function sendJsonAssertFailedAlert(monitor: Monitor, path: string, expected: string) {
  const inner =
    banner(
      "#fff7ed", "#fed7aa", "#f97316",
      "#7c2d12", "#c2410c",
      "JSON Check Failed", "#fed7aa", "#9a3412",
      `Response assertion failed for ${esc(monitor.name)}`,
      esc(monitor.url),
    ) +
    bodySection(
      detailRow("Monitor", esc(monitor.name)) +
      detailRow("URL", esc(monitor.url), true) +
      detailRow("JSON path", `<code style="background:#fff7ed;padding:1px 4px;border-radius:3px">${esc(path)}</code>`) +
      detailRow("Expected", `<code style="background:#fff7ed;padding:1px 4px;border-radius:3px">${esc(expected)}</code>`) +
      detailRow("Action", "The JSON response no longer matches the expected value. Your API health check may be failing."),
    ) +
    ctaSection("View monitor", `${APP_URL}/dashboard/monitors/${monitor.id}`, "#ea580c");

  await sendAlertEmail(monitor, `⚠️ JSON assertion failed — ${monitor.name}`, inner, "JSON_ASSERT_FAILED", { path, expected });
}

export async function sendJsonAssertRecoveredAlert(monitor: Monitor, path: string) {
  const inner =
    banner(
      "#f0fdf4", "#bbf7d0", "#22c55e",
      "#14532d", "#15803d",
      "JSON Check Recovered", "#bbf7d0", "#166534",
      `JSON assertion is passing again for ${esc(monitor.name)}`,
      esc(monitor.url),
    ) +
    bodySection(
      detailRow("Monitor", esc(monitor.name)) +
      detailRow("URL", esc(monitor.url), true) +
      detailRow("JSON path", `<code style="background:#f0fdf4;padding:1px 4px;border-radius:3px">${esc(path)}</code>`) +
      detailRow("Status", "The response now matches the expected value again."),
    ) +
    ctaSection("View monitor", `${APP_URL}/dashboard/monitors/${monitor.id}`, "#16a34a");

  await sendAlertEmail(monitor, `✅ JSON assertion recovered — ${monitor.name}`, inner, "JSON_ASSERT_RECOVERED", { path });
}
