import axios from "axios";
import https from "https";
import { createHash } from "crypto";
import { URL } from "url";

export interface RobotsChecks {
  blocksAll: boolean;
  hash: string;
}

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

export async function checkRobots(url: string): Promise<RobotsChecks | null> {
  const origin = new URL(url).origin;
  try {
    const res = await axios.get(`${origin}/robots.txt`, {
      timeout: 8000,
      httpsAgent,
      validateStatus: () => true,
      responseType: "text",
    });

    if (res.status !== 200 || typeof res.data !== "string") return null;

    const text: string = res.data;
    const hash = createHash("sha256").update(text).digest("hex");
    const blocksAll = parsesBlocksAll(text);

    return { blocksAll, hash };
  } catch {
    return null;
  }
}

function parsesBlocksAll(text: string): boolean {
  const lines = text.split(/\r?\n/).map((l) => l.trim().toLowerCase());
  let inWildcardBlock = false;

  for (const line of lines) {
    if (line.startsWith("user-agent:")) {
      const agent = line.replace("user-agent:", "").trim();
      inWildcardBlock = agent === "*";
    } else if (inWildcardBlock && line.startsWith("disallow:")) {
      const path = line.replace("disallow:", "").trim();
      if (path === "/") return true;
    }
  }
  return false;
}
