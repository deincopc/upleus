import * as tls from "tls";
import { URL } from "url";

export interface SslCheckResult {
  valid: boolean;
  expiresAt: Date | null;
  daysUntilExpiry: number | null;
  error: string | null;
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
          const authorized = socket.authorized;
          socket.destroy();

          if (!cert || !cert.valid_to) {
            resolve({ valid: false, expiresAt: null, daysUntilExpiry: null, error: "No certificate found" });
            return;
          }

          const expiresAt = new Date(cert.valid_to);
          const daysUntilExpiry = Math.floor(
            (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );

          resolve({
            valid: authorized && daysUntilExpiry > 0,
            expiresAt,
            daysUntilExpiry,
            error: authorized
              ? null
              : (socket.authorizationError?.toString() ?? "Certificate not authorized"),
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
