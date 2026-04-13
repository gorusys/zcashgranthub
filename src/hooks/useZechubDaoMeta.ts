import { useQuery } from "@tanstack/react-query";
import type { ZechubDaoMeta } from "@/lib/daodao/types";

async function fetchDaoMeta(): Promise<ZechubDaoMeta> {
  const res = await fetch("/api/daodao/dao-meta");
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  const data = (await res.json()) as { dao: ZechubDaoMeta };
  return data.dao;
}

/** Live ZecHub DAO core metadata from the DAO DAO indexer (Juno). */
export function useZechubDaoMeta() {
  return useQuery({
    queryKey: ["zechub-dao-meta"],
    queryFn: fetchDaoMeta,
    staleTime: 60_000,
    retry: 1,
  });
}
