import { createHash } from "crypto";

export function hashContent(html: string): string {
  // Strip script/style/noscript blocks and their content
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    // Strip remaining tags, leaving text
    .replace(/<[^>]+>/g, " ")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim()
    // Cap at 100KB to avoid hashing massive pages
    .slice(0, 100_000);

  return createHash("sha256").update(stripped).digest("hex");
}
