import Link from "next/link";
import { ArrowRight, Scale } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface ZechubProposalCardRow {
  id: number;
  proposal: {
    title: string;
    status: string;
    votes: { yes: string; no: string; abstain: string };
  };
}

function statusPillClass(raw: string): string {
  const s = raw.toLowerCase();
  if (s === "open" || s === "voting")
    return "bg-blue-500/20 text-blue-300 border-blue-500/30";
  if (s === "executed" || s === "passed")
    return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
  if (s === "rejected")
    return "bg-red-500/20 text-red-300 border-red-500/30";
  if (s === "draft")
    return "bg-secondary text-muted-foreground border-border";
  return "bg-secondary text-muted-foreground border-border";
}

export function ZechubProposalCard({ row }: { row: ZechubProposalCardRow }) {
  const y = row.proposal.votes.yes || "0";
  const n = row.proposal.votes.no || "0";
  const a = row.proposal.votes.abstain || "0";

  return (
    <Link href={`/zechub/proposals/${row.id}`}>
      <Card className="group border-border/50 bg-card transition-all duration-200 hover:border-primary/30 hover:glow-gold">
        <CardContent className="p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="font-mono text-[10px]">
                A{row.id}
              </Badge>
              <span
                className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusPillClass(row.proposal.status)}`}
              >
                {row.proposal.status}
              </span>
              <Badge variant="secondary" className="font-normal">
                ZecHub DAO
              </Badge>
            </div>
          </div>

          <h3 className="mb-2 line-clamp-2 text-base font-semibold text-foreground transition-colors group-hover:text-primary">
            {row.proposal.title}
          </h3>

          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Scale className="h-4 w-4 shrink-0 text-primary/70" />
            <span>On-chain proposal (DAO DAO)</span>
          </div>

          <div className="mb-3 text-sm font-medium text-primary">
            Votes · Yes {y} · No {n}
            {a !== "0" ? ` · Abstain ${a}` : ""}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-mono">#{row.id}</span>
            </div>
            <span className="flex items-center gap-1 text-xs font-medium text-primary transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
              View proposal <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
