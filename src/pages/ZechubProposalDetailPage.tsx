import Link from "next/link";
import Head from "next/head";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ExternalLink,
  AlertCircle,
  Scale,
  Vote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RelatedRecordsCard } from "@/components/RelatedRecordsCard";
import { ProposalDescription } from "@/components/zechub/ProposalDescription";
import { useRelatedForProposal } from "@/hooks/useRelatedForProposal";
import type { ZechubProposalView } from "@/lib/daodao/types";
import { zechubDaoDaodaoUrl } from "@/lib/daodao/zechubConfig";

function statusBadge(p: ZechubProposalView) {
  const map: Record<
    ZechubProposalView["status"],
    { label: string; className: string }
  > = {
    in_voting: {
      label: "In voting",
      className: "bg-blue-500/20 text-blue-300",
    },
    passed: {
      label: "Passed",
      className: "bg-emerald-500/20 text-emerald-300",
    },
    rejected: {
      label: "Rejected",
      className: "bg-red-500/20 text-red-300",
    },
    closed: {
      label: "Closed",
      className: "bg-secondary text-muted-foreground",
    },
    draft: {
      label: "Draft",
      className: "bg-secondary text-muted-foreground",
    },
  };
  return map[p.status];
}

async function fetchProposal(id: number): Promise<ZechubProposalView> {
  const res = await fetch(`/api/daodao/proposal?id=${id}`);
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || `Proposal ${res.status}`);
  }
  const data = (await res.json()) as { proposal: ZechubProposalView };
  return data.proposal;
}

export default function ZechubProposalDetailPage({ id }: { id: string }) {
  const proposalId = parseInt(id, 10);
  const valid = !Number.isNaN(proposalId) && proposalId > 0;

  const { data: proposal, isLoading, isError, error } = useQuery({
    queryKey: ["zechub-proposal", proposalId],
    queryFn: () => fetchProposal(proposalId),
    enabled: valid,
  });

  const {
    data: related,
    isLoading: relatedLoading,
    isError: relatedError,
    error: relatedErr,
  } = useRelatedForProposal(
    valid ? proposalId : undefined,
    proposal?.title
  );

  const daoUrl = zechubDaoDaodaoUrl();

  if (!valid) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-xl font-bold text-foreground">Invalid proposal id</h1>
        <Link href="/zechub/proposals">
          <Button variant="outline" className="mt-4">
            Back to proposals
          </Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto animate-pulse px-4 py-8">
        <div className="mb-6 h-4 w-32 rounded bg-secondary" />
        <div className="mb-4 h-8 w-2/3 rounded bg-secondary" />
        <div className="h-40 rounded-lg bg-secondary" />
      </div>
    );
  }

  if (isError || !proposal) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <AlertCircle className="mx-auto mb-4 h-10 w-10 text-red-400" />
        <h1 className="text-2xl font-bold text-foreground">Could not load proposal</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {(error as Error)?.message ?? "Indexer or network error."}
        </p>
        <Link href="/zechub/proposals">
          <Button variant="outline" className="mt-6">
            Back to proposals
          </Button>
        </Link>
      </div>
    );
  }

  const sb = statusBadge(proposal);

  return (
    <div className="container mx-auto min-w-0 px-4 py-6 sm:py-8">
      <Head>
        <title>{proposal.title} · ZecHub DAO · Zcash Grants Hub</title>
        <meta
          name="description"
          content={`ZecHub DAO proposal A${proposal.id} on Juno (DAO DAO). ${proposal.title.slice(0, 120)}`}
        />
      </Head>
      <Link
        href="/zechub/proposals"
        className="mb-5 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        All ZecHub proposals
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-mono">
              A{proposal.id}
            </Badge>
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs ${sb.className}`}
            >
              {sb.label}
            </span>
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer select-none hover:text-foreground">
                On-chain status ({proposal.rawStatus})
              </summary>
            </details>
          </div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl lg:text-3xl">
            {proposal.title}
          </h1>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {proposal.status === "in_voting" && (
            <Button size="sm" className="gap-2" asChild>
              <a href={proposal.daodaoUrl} target="_blank" rel="noopener noreferrer">
                <Vote className="h-4 w-4" />
                Vote on DAO DAO
              </a>
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <a href={proposal.daodaoUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              Open on DAO DAO
            </a>
          </Button>
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <a href={daoUrl} target="_blank" rel="noopener noreferrer">
              <Scale className="h-4 w-4" />
              ZecHub DAO
            </a>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-6">
          {proposal.status === "in_voting" && (
            <Card className="border-primary/35 bg-primary/[0.06]">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Voting is open</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    DAO members vote on{" "}
                    <span className="font-medium text-foreground/90">DAO DAO</span>: connect a Juno
                    wallet there (e.g. Keplr or Leap), then cast Yes / No / Abstain. This hub does not
                    sign transactions.
                  </p>
                </div>
                <Button className="shrink-0 gap-2" asChild>
                  <a href={proposal.daodaoUrl} target="_blank" rel="noopener noreferrer">
                    <Vote className="h-4 w-4" />
                    Vote on DAO DAO
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}

          {proposal.totalVotes > 0 && (
            <Card className="border-border/50 bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Votes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(
                  [
                    ["Yes", proposal.votePercent.yes, "bg-emerald-400"],
                    ["No", proposal.votePercent.no, "bg-red-400"],
                    ["Abstain", proposal.votePercent.abstain, "bg-slate-400"],
                  ] as const
                ).map(([label, pct, color]) => (
                  <div key={label}>
                    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{label}</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full ${color}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <ProposalDescription
                text={proposal.description?.trim() || ""}
              />
            </CardContent>
          </Card>

          <RelatedRecordsCard
            items={related}
            isLoading={relatedLoading}
            isError={relatedError}
            errorMessage={(relatedErr as Error)?.message}
          />
        </div>

        <aside className="w-full shrink-0 space-y-3 lg:w-64 xl:w-72">
          <Card className="border-border/50 bg-card">
            <CardContent className="p-4 text-xs text-muted-foreground">
              <p className="leading-relaxed">
                This page reads live data from the DAO DAO indexer. ZecHub proposals are independent
                from ZCG or Coinholder GitHub applications; use{" "}
                <span className="font-medium text-foreground/90">Related records</span> for
                cross-program hints.
              </p>
              <p className="mt-3">
                <Link
                  href="/zechub/proposals/guide"
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  How to create proposals & vote
                </Link>{" "}
                on DAO DAO.
              </p>
              {proposal.expiresAtIso && proposal.status === "in_voting" && (
                <p className="mt-3">
                  Voting ends{" "}
                  <span className="text-foreground">
                    {new Date(proposal.expiresAtIso).toLocaleString()}
                  </span>
                </p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
