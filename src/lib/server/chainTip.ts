/** Current mainnet tip from Blockchair, cached for a minute, with an estimate fallback. */
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

export async function getChainTip(): Promise<ChainTip> {
  if (!cache || Date.now() - cache.at > TTL_MS) {
    try {
      cache = { tip: await fromBlockchair(), at: Date.now() };
    } catch {
      const base = cache?.tip ?? REFERENCE;
      const now = Date.now();
      cache = { tip: { height: estimateHeightAt(now, base), time: now, source: "estimate" }, at: now };
    }
  }
  return cache.tip;
}
