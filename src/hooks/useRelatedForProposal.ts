import { useQuery } from "@tanstack/react-query";
import type { RelatedItem } from "@/lib/related/resolveRelated";

async function fetchRelated(
  proposalId: number,
  title: string
): Promise<RelatedItem[]> {
  const params = new URLSearchParams({
    id: String(proposalId),
    title,
  });
  const res = await fetch(`/api/related/for-proposal?${params}`);
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || `Related lookup failed (${res.status})`);
  }
  const data = (await res.json()) as { related: RelatedItem[] };
  return data.related ?? [];
}

export function useRelatedForProposal(
  proposalId: number | undefined,
  title: string | undefined
) {
  return useQuery({
    queryKey: ["related-proposal", proposalId, title],
    queryFn: () => fetchRelated(proposalId!, title!),
    enabled:
      proposalId !== undefined &&
      proposalId > 0 &&
      Boolean(title && title.trim().length > 0),
    staleTime: 60_000,
  });
}
