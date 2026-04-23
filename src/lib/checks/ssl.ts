import * as tls from "tls";
import { URL } from "url";

export interface SslCheckResult {
  valid: boolean;
  expiresAt: Date | null;
  daysUntilExpiry: number | null;
  error: string | null;
}

function hostnameMatchesCert(hostname: string, cert: tls.PeerCertificate): boolean {
  const host = hostname.toLowerCase();

  // Prefer Subject Alternative Names (SANs) — CN is deprecated for hostname matching
  if (cert.subjectaltname) {
    const sans = cert.subjectaltname
      .split(", ")
      .filter((s) => s.startsWith("DNS:"))
      .map((s) => s.slice(4).toLowerCase());

    for (const san of sans) {
      if (san === host) return true;
      if (san.startsWith("*.")) {
        const base = san.slice(2); // e.g. "example.com"
        if (host.endsWith("." + base) && !host.slice(0, -(base.length + 1)).includes(".")) {
          return true; // single-level wildcard only
        }
      }
    }
    return false;
  }

  // Fallback to CN
  const cn = (cert.subject as { CN?: string })?.CN?.toLowerCase();
  if (!cn) return false;
  if (cn === host) return true;
  if (cn.startsWith("*.")) {
    const base = cn.slice(2);
    if (host.endsWith("." + base) && !host.slice(0, -(base.length + 1)).includes(".")) {
      return true;
    }
  }
  return false;
}

export async function checkSsl(url: string): Promise<SslCheckResult> {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:") {
        resolve({ valid: false, expiresAt: null, daysUntilExpiry: null, error: "Not HTTPS" });
        return;
      }

      const hostname = parsed.hostname;
      const port = parsed.port ? parseInt(parsed.port) : 443;

      const socket = tls.connect(
        { host: hostname, port, servername: hostname, rejectUnauthorized: false },
        () => {
          const cert = socket.getPeerCertificate();
          socket.destroy();

          if (!cert || !cert.valid_to) {
            resolve({ valid: false, expiresAt: null, daysUntilExpiry: null, error: "No certificate found" });
            return;
          }

          const expiresAt = new Date(cert.valid_to);
          const daysUntilExpiry = Math.floor(
            (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );

          // Validity = not expired + hostname matches the cert.
          // We intentionally do NOT use socket.authorized here — that fails on incomplete
          // chains (missing intermediates), which Node.js can't resolve automatically
          // even though browsers handle it fine. Chain issues are surfaced separately
          // as a security posture flag, not as an outage.
          const notExpired = daysUntilExpiry > 0;
          const hostnameOk = hostnameMatchesCert(hostname, cert);
          const valid = notExpired && hostnameOk;

          resolve({
            valid,
            expiresAt,
            daysUntilExpiry,
            error: valid
              ? null
              : !notExpired
              ? `Certificate expired on ${expiresAt.toISOString().slice(0, 10)}`
              : "Certificate hostname mismatch",
          });
        }
      );

      socket.on("error", (err) => {
        resolve({ valid: false, expiresAt: null, daysUntilExpiry: null, error: err.message });
      });

      socket.setTimeout(10000, () => {
        socket.destroy();
        resolve({ valid: false, expiresAt: null, daysUntilExpiry: null, error: "SSL check timed out" });
      });
    } catch (err) {
      resolve({
        valid: false,
        expiresAt: null,
        daysUntilExpiry: null,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });
}
