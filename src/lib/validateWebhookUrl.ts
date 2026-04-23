/**
 * Validates a user-supplied webhook URL.
 * Returns an error string if invalid, or null if safe to use.
 *
 * Blocks:
 * - Non-http/https schemes (javascript:, file:, etc.)
 * - Localhost and loopback addresses
 * - Private/internal IP ranges (SSRF protection)
 * - AWS/GCP/Azure metadata endpoints
 */
export function validateWebhookUrl(raw: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return "Webhook URL is not a valid URL.";
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "Webhook URL must use http or https.";
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost variants
  if (hostname === "localhost" || hostname === "0.0.0.0") {
    return "Webhook URL must not point to a local address.";
  }

  // Block IPv6 loopback
  if (hostname === "::1" || hostname === "[::1]") {
    return "Webhook URL must not point to a local address.";
  }

  // Parse dotted-decimal IPv4 and check private ranges
  const ipv4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [, a, b, c] = ipv4.map(Number);
    if (
      a === 127 ||                          // 127.0.0.0/8 loopback
      a === 10 ||                           // 10.0.0.0/8 private
      a === 0 ||                            // 0.0.0.0/8
      (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12 private
      (a === 192 && b === 168) ||           // 192.168.0.0/16 private
      (a === 169 && b === 254) ||           // 169.254.0.0/16 link-local (AWS metadata)
      (a === 100 && b >= 64 && b <= 127)   // 100.64.0.0/10 shared address space
    ) {
      return "Webhook URL must not point to a private or reserved IP address.";
    }
  }

  // Block well-known metadata hostnames
  const blockedHosts = [
    "metadata.google.internal",
    "169.254.169.254",
    "fd00:ec2::254",
  ];
  if (blockedHosts.includes(hostname)) {
    return "Webhook URL must not point to a cloud metadata endpoint.";
  }

  return null;
}
