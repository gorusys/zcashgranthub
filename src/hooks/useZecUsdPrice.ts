import { useEffect, useState } from "react";

const COINGECKO_ZEC =
  "https://api.coingecko.com/api/v3/simple/price?ids=zcash&vs_currencies=usd&include_24hr_change=true";

type Status = "idle" | "loading" | "ok" | "error";

export interface ZecUsdPriceState {
  usd: number | null;
  change24hPct: number | null;
  status: Status;
}

const DEFAULT_REFETCH_MS = 120_000;

/**
 * Live ZEC/USD from CoinGecko public API (no key). Refetches on an interval.
 */
export function useZecUsdPrice(refetchMs: number = DEFAULT_REFETCH_MS): ZecUsdPriceState {
  const [usd, setUsd] = useState<number | null>(null);
  const [change24hPct, setChange24hPct] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setStatus((s) => (s === "idle" ? "loading" : s));
      try {
        const res = await fetch(COINGECKO_ZEC);
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as {
          zcash?: { usd?: number; usd_24h_change?: number };
        };
        const z = data.zcash;
        if (cancelled) return;
        if (z && typeof z.usd === "number") {
          setUsd(z.usd);
          setChange24hPct(typeof z.usd_24h_change === "number" ? z.usd_24h_change : null);
          setStatus("ok");
        } else {
          setStatus("error");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    };

    void load();
    const id = setInterval(() => void load(), refetchMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [refetchMs]);

  return { usd, change24hPct, status };
}
