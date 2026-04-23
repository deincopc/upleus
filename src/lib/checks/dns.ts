import { resolve4 } from "dns/promises";
import { URL } from "url";

export interface DnsResult {
  ips: string[];
}

export async function checkDns(url: string): Promise<DnsResult | null> {
  try {
    const hostname = new URL(url).hostname;
    const ips = await resolve4(hostname);
    return { ips: ips.sort() };
  } catch {
    return null;
  }
}
