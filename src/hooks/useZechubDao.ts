import { useQuery } from "@tanstack/react-query";
import type { Grant } from "@/data/mockData";
import type { ZechubDaoMeta, ZechubProposalView } from "@/lib/daodao/types";

export type ZechubApiResponse = {
  dao: ZechubDaoMeta;
  proposal: ZechubProposalView | null;
  resolution:
    | "by_id"
    | "by_github_issue"
    | "by_grant_title"
    | "parsed_id_failed_lookup"
    | "none";
};

async function fetchZechub(grant: Grant): Promise<ZechubApiResponse> {
  const params = new URLSearchParams();
  params.set("githubIssue", grant.id);
  params.set("grantTitle", grant.title);
  if (
    grant.zechubDaoProposalId !== undefined &&
    grant.zechubDaoProposalId !== null
  ) {
    params.set("proposalId", String(grant.zechubDaoProposalId));
  }
  const res = await fetch(`/api/daodao/zechub?${params.toString()}`);
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || `ZecHub DAO request failed (${res.status})`);
  }
  return res.json() as Promise<ZechubApiResponse>;
}

/** Live ZecHub DAO (DAO DAO) metadata + optional matching proposal for this grant. */
export function useZechubDaoForGrant(grant: Grant | undefined) {
  return useQuery({
    queryKey: [
      "zechub-dao",
      grant?.id,
      grant?.title,
      grant?.zechubDaoProposalId ?? null,
    ],
    queryFn: () => fetchZechub(grant!),
    enabled: Boolean(grant),
    staleTime: 30_000,
  });
}
