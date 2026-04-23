export type WebhookAlertType =
  | "DOWN"
  | "RECOVERED"
  | "SSL_INVALID"
  | "SSL_EXPIRY"
  | "DOMAIN_EXPIRY"
  | "SLOW_RESPONSE"
  | "SLOW_RECOVERED"
  | "WP_OUTDATED"
  | "WP_SECURITY"
  | "KEYWORD_MISSING"
  | "KEYWORD_FOUND"
  | "HTTP_SECURITY"
  | "SHOPIFY_PASSWORD_MODE"
  | "SHOPIFY_PASSWORD_CLEARED"
  | "SHOPIFY_ISSUE"
  | "CONTENT_CHANGED"
  | "ROBOTS_BLOCKING"
  | "DNS_CHANGED"
  | "ESCALATION"
  | "JSON_ASSERT_FAILED"
  | "JSON_ASSERT_RECOVERED";

export interface WebhookPayload {
  alertType: WebhookAlertType;
  timestamp: string;
  monitor: {
    id: string;
    name: string;
    url: string;
    type: string;
  };
  details: Record<string, string | number | boolean | null>;
}

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 2_000; // 2s, 4s, 8s

/**
 * Fire-and-forget POST to a user-supplied webhook URL.
 * Retries up to 3 times with exponential backoff on network errors or 5xx responses.
 * Never throws — a failed webhook must never block or crash a check run.
 */
export async function dispatchWebhook(
  webhookUrl: string,
  payload: WebhookPayload,
): Promise<void> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8_000);

      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "Upleus/1.0" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) return; // success

      // 4xx errors are permanent (bad URL, auth required, etc.) — don't retry
      if (res.status >= 400 && res.status < 500) {
        console.error(`[webhook] ${webhookUrl} responded ${res.status} (permanent failure, not retrying)`);
        return;
      }

      // 5xx — server error, worth retrying
      console.warn(`[webhook] ${webhookUrl} responded ${res.status} (attempt ${attempt}/${MAX_ATTEMPTS})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[webhook] delivery failed to ${webhookUrl}: ${msg} (attempt ${attempt}/${MAX_ATTEMPTS})`);
    }

    if (attempt < MAX_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, BASE_DELAY_MS * Math.pow(2, attempt - 1)));
    }
  }

  console.error(`[webhook] gave up delivering to ${webhookUrl} after ${MAX_ATTEMPTS} attempts`);
}
