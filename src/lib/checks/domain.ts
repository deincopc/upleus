export interface DomainCheckResult {
  valid: boolean;
  expiresAt: Date | null;
  daysUntilExpiry: number | null;
  error: string | null;
}

// Outer abort guard — whoiser's internal timeout fires on connect, but a server
// that connects and then goes silent can still hang indefinitely. This races the
// entire lookup against a hard deadline and returns a clean error if it loses.
const OUTER_TIMEOUT_MS = 15_000;

export async function checkDomain(domain: string): Promise<DomainCheckResult> {
  return Promise.race([_checkDomain(domain), _timeout(OUTER_TIMEOUT_MS)]);
}

function _timeout(ms: number): Promise<DomainCheckResult> {
  return new Promise((resolve) =>
    setTimeout(
      () => resolve({ valid: false, expiresAt: null, daysUntilExpiry: null, error: "WHOIS lookup timed out" }),
      ms,
    )
  );
}

async function _checkDomain(domain: string): Promise<DomainCheckResult> {
  try {
    // Strip protocol/path if someone passed a full URL
    const bare = domain.replace(/^https?:\/\//i, "").split("/")[0].toLowerCase();

    // Dynamic import required — whoiser is pure ESM and can't be statically imported
    const { whoisDomain } = await import("whoiser");
    const results = await whoisDomain(bare, { follow: 1, timeout: 10000 });

    // whoisDomain returns an object keyed by whois server — grab the first populated result
    const data = Object.values(results).find(
      (r) => typeof r === "object" && r !== null && ("Expiry Date" in r || "Registry Expiry Date" in r)
    ) as Record<string, string> | undefined;

    if (!data) {
      return { valid: false, expiresAt: null, daysUntilExpiry: null, error: "Could not determine expiry date" };
    }

    const rawExpiry = data["Expiry Date"] ?? data["Registry Expiry Date"];
    if (!rawExpiry) {
      return { valid: false, expiresAt: null, daysUntilExpiry: null, error: "Expiry date not found in WHOIS data" };
    }

    const expiresAt = new Date(rawExpiry);
    if (isNaN(expiresAt.getTime())) {
      return { valid: false, expiresAt: null, daysUntilExpiry: null, error: `Unrecognised expiry format: ${rawExpiry}` };
    }

    const daysUntilExpiry = Math.floor((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    return { valid: daysUntilExpiry > 0, expiresAt, daysUntilExpiry, error: null };
  } catch (err) {
    return {
      valid: false,
      expiresAt: null,
      daysUntilExpiry: null,
      error: err instanceof Error ? err.message : "WHOIS lookup failed",
    };
  }
}
