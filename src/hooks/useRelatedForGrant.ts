import { useQuery } from "@tanstack/react-query";
import type { Grant } from "@/data/mockData";
import type { RelatedItem } from "@/lib/related/resolveRelated";

async function fetchRelated(grant: Grant): Promise<RelatedItem[]> {
  const params = new URLSearchParams({
    grantKey: grant.id,
    title: grant.title,
  });
  const res = await fetch(`/api/related/for-grant?${params}`);
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || `Related lookup failed (${res.status})`);
  }
  const data = (await res.json()) as { related: RelatedItem[] };
  return data.related ?? [];
}

/** Cross-program suggestions (ZCG, Coinholder, ZecHub DAO) for a GitHub-sourced grant. */
export function useRelatedForGrant(grant: Grant | undefined) {
  return useQuery({
    queryKey: ["related-grant", grant?.id, grant?.title],
    queryFn: () => fetchRelated(grant!),
    enabled: Boolean(grant?.id && grant?.title),
    staleTime: 60_000,
  });
}
