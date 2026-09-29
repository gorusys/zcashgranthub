import { useEffect, useState } from "react";

const KRAKEN_ZEC_USD =
  "https://api.kraken.com/0/public/Ticker?pair=ZECUSD";

type Status = "idle" | "loading" | "ok" | "error";

export interface ZecUsdPriceState {
  usd: number | null;
  change24hPct: number | null;
  status: Status;
}

const DEFAULT_REFETCH_MS = 120_000;

interface KrakenTickerResponse {
  error: string[];
  result: {
    XZECZUSD?: {
      c: [string, string]; // last trade price
      p: [string, string]; // volume-weighted average price
      o: string;            // today's opening price
    };
  };
}

/**
 * Live ZEC/USD price from Kraken public API.
 * Refetches on an interval.
 */
export function useZecUsdPrice(
  refetchMs: number = DEFAULT_REFETCH_MS
): ZecUsdPriceState {
  const [usd, setUsd] = useState<number | null>(null);
  const [change24hPct, setChange24hPct] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setStatus((s) => (s === "idle" ? "loading" : s));

      try {
        const res = await fetch(KRAKEN_ZEC_USD);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = (await res.json()) as KrakenTickerResponse;
        if (data.error?.length) {
          throw new Error(data.error.join(", "));
        }
        
        const ticker = data.result?.XZECZUSD;
        
        if (!ticker) {
          throw new Error("ZECUSD ticker not found");
        }

        const price = Number(ticker.c[0]);
        const open = Number(ticker.o);

        if (!Number.isFinite(price)) {
          throw new Error("Invalid ZEC price");
        }

        // Kraken gives today's opening price, so calculate
        // the percentage change ourselves.
        const change =
          Number.isFinite(open) && open !== 0
            ? ((price - open) / open) * 100
            : null;

        if (cancelled) return;
        setUsd(price);
        setChange24hPct(change);
        setStatus("ok");
      } catch {
        if (!cancelled) {
          setStatus("error");
        }
      }
    };

    void load();

    const id = setInterval(() => {
      void load();
    }, refetchMs);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [refetchMs]);

  return {
    usd,
    change24hPct,
    status,
  };
}