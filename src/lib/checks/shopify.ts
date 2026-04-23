import axios from "axios";
import https from "https";
import { URL } from "url";

export interface ShopifyChecks {
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
}

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

export function looksLikeShopify(html: string, headers?: Record<string, string>): boolean {
  if (headers) {
    const h = (k: string) => headers[k] ?? headers[k.toLowerCase()] ?? "";
    if (
      h("x-shopify-stage") ||
      h("x-sorting-hat-shopid") ||
      h("x-sorting-hat-podid") ||
      h("x-shardid") ||
      h("set-cookie").includes("_shopify_")
    ) {
      return true;
    }
  }

  return (
    html.includes("cdn.shopify.com") ||
    html.includes("shopifycloud.com") ||
    html.includes("myshopify.com") ||
    html.includes("Shopify.theme") ||
    html.includes("window.Shopify") ||
    html.includes("var Shopify") ||
    html.includes("shopify-section-") ||
    html.includes("shopify_analytics") ||
    html.includes("shopify_pay") ||
    /content=["']Shopify["']/i.test(html)
  );
}

export async function checkShopify(url: string, html: string): Promise<ShopifyChecks> {
  const origin = new URL(url).origin;

  const passwordModeEnabled =
    html.includes('action="/password"') ||
    /name="form_type"[^>]*value="storefront_password"/i.test(html) ||
    html.includes('"storefront_password"');

  const maintenanceModeEnabled =
    /class="[^"]*maintenance/i.test(html) ||
    /<title>[^<]*maintenance[^<]*<\/title>/i.test(html);

  const gaPresent =
    html.includes("gtag(") ||
    html.includes("googletagmanager.com") ||
    /['"]G-[A-Z0-9]{4,}['"]/.test(html) ||
    /['"]UA-\d+-\d+['"]/.test(html);

  const metaPixelPresent =
    html.includes("connect.facebook.net") ||
    html.includes("fbq(");

  const tiktokPixelPresent =
    html.includes("analytics.tiktok.com") ||
    html.includes("tiktok.com/i18n/pixel") ||
    html.includes("ttq.track") ||
    html.includes("ttq.load");

  const klaviyoPresent =
    html.includes("klaviyo.com") ||
    html.includes("klaviyo.identify") ||
    html.includes("_learnq");

  const cookieConsentPresent =
    html.includes("cookieyes.com") ||
    html.includes("cookiebot.com") ||
    html.includes("onetrust.com") ||
    html.includes("OneTrust") ||
    html.includes("CookieConsent") ||
    html.includes("cookiefirst.com") ||
    html.includes("termly.io");

  const reviewsApp =
    html.includes("judge.me") ? "Judge.me" :
    html.includes("yotpo.com") ? "Yotpo" :
    html.includes("okendo.io") ? "Okendo" :
    html.includes("stamped.io") ? "Stamped" :
    html.includes("loox.io") ? "Loox" :
    html.includes("reviews.io") ? "Reviews.io" :
    null;

  const liveChat =
    html.includes("tidio.com") || html.includes("tidiochat") ? "Tidio" :
    html.includes("gorgias.com") ? "Gorgias" :
    html.includes("zendesk.com") || html.includes("zopim") ? "Zendesk" :
    html.includes("intercom.io") || html.includes("intercomSettings") ? "Intercom" :
    html.includes("livechat.com") || html.includes("livechatinc.com") ? "LiveChat" :
    html.includes("freshchat") ? "Freshchat" :
    null;

  const themeMatch = html.match(/Shopify\.theme\s*=\s*\{[^}]*"name"\s*:\s*"([^"]+)"/);
  const themeName = themeMatch?.[1] ?? null;

  const [cartRes] = await Promise.allSettled([
    axios.get(`${origin}/cart.js`, { timeout: 5000, httpsAgent, validateStatus: () => true }),
  ]);

  const cartApiUp =
    cartRes.status === "fulfilled"
      ? cartRes.value.status === 200 &&
        typeof cartRes.value.data === "object" &&
        cartRes.value.data !== null &&
        "items" in cartRes.value.data
      : false;

  return {
    passwordModeEnabled,
    maintenanceModeEnabled,
    cartApiUp,
    gaPresent,
    metaPixelPresent,
    tiktokPixelPresent,
    klaviyoPresent,
    cookieConsentPresent,
    reviewsApp,
    liveChat,
    themeName,
  };
}
