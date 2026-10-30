import type { NextApiRequest, NextApiResponse } from "next";
import { estimateHeightAt, type ChainRef } from "@/lib/fundingStreams";

export interface ChainTip extends ChainRef {
  source: "blockchair" | "estimate";
}

/** Known mainnet block, used to estimate the tip when the explorer API is unavailable. */
const REFERENCE: ChainRef = { height: 3_535_681, time: Date.parse("2026-10-30T08:50:11Z") };
const TTL_MS = 60_000;

let cache: { tip: ChainTip; at: number } | null = null;

async function fromBlockchair(): Promise<ChainTip> {
  const res = await fetch("https://api.blockchair.com/zcash/stats", {
    signal: AbortSignal.timeout(8_000),
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Blockchair ${res.status}`);
  const body = (await res.json()) as { data?: { best_block_height?: number; best_block_time?: string } };
  const height = body.data?.best_block_height;
  const time = Date.parse(`${body.data?.best_block_time ?? ""}Z`.replace(" ", "T"));
  if (typeof height !== "number" || !Number.isFinite(time)) throw new Error("Unexpected Blockchair response");
  return { height, time, source: "blockchair" };
}

/** Current mainnet tip (height + block time), cached for a minute. */
export default async function handler(req: NextApiRequest, res: NextApiResponse<ChainTip | { error: string }>) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!cache || Date.now() - cache.at > TTL_MS) {
    try {
      cache = { tip: await fromBlockchair(), at: Date.now() };
    } catch {
      const base = cache?.tip ?? REFERENCE;
      const now = Date.now();
      cache = { tip: { height: estimateHeightAt(now, base), time: now, source: "estimate" }, at: now };
    }
  }
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  return res.status(200).json(cache.tip);
}
