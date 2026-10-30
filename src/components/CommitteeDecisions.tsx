import { useUi } from "@/i18n/useUi";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ExternalLink, Gavel } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ZcgDecision, ZcgOutcome } from "@/lib/zcgMinutes";

export interface DecisionsResponse {
  decisions: ZcgDecision[];
  total: number;
  meetings: number;
  listedAt: string | null;
}

const OUTCOME: Record<ZcgOutcome, { label: string; className: string }> = {
  approved: { label: "Approved", className: "bg-emerald-500/20 text-emerald-400" },
  declined: { label: "Declined", className: "bg-red-500/20 text-red-400" },
  open: { label: "Remains open", className: "bg-blue-500/20 text-blue-400" },
  unknown: { label: "Discussed", className: "bg-muted text-muted-foreground" },
};

export function OutcomeBadge({ outcome }: { outcome: ZcgOutcome }) {
  const { text: tx } = useUi();
  const o = OUTCOME[outcome];
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium", o.className)}>
      {tx(o.label)}
    </span>
  );
}

const fmtDate = (locale: string, iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

/** One meeting's decision on a proposal, with members' stated reasons. */
export function DecisionEntry({
  d,
  showTitle = false,
  defaultOpen = false,
}: {
  d: ZcgDecision;
  showTitle?: boolean;
  defaultOpen?: boolean;
}) {
  const { text: tx, locale: uiLocale } = useUi();
  const [open, setOpen] = useState(defaultOpen);
  const note = d.outcomeText && !/^(approved|declined|remains open)\.?$/i.test(d.outcomeText) ? d.outcomeText : "";
  return (
    <div className="py-3">
      <div className="flex flex-wrap items-center gap-2">
        <OutcomeBadge outcome={d.outcome} />
        <span className="text-xs text-muted-foreground">{tx(fmtDate(uiLocale, d.meetingDate))}</span>
        {d.requestedUsd != null && (
          <span className="text-xs text-muted-foreground">
            {tx("· requested $")}{d.requestedUsd.toLocaleString(uiLocale)}
          </span>
        )}
        <a
          href={d.minutesUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          {tx("Minutes ")}<ExternalLink className="h-3 w-3" />
        </a>
      </div>
      {showTitle && (
        <a
          href={d.forumUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 block font-medium text-foreground hover:text-primary"
        >
          {d.title}
        </a>
      )}
      {note && <p className="mt-1 text-sm text-foreground/90">{note}</p>}
      {d.statements.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
            {tx(open ? "Hide" : "Show")} {tx(" committee reasoning (")}{d.statements.length})
          </button>
          {open && (
            <ul className="mt-2 space-y-2 border-l-2 border-border pl-3">
              {d.statements.map((s, i) => (
                <li key={i} className="text-sm">
                  <span className="font-medium text-foreground">{s.member}:</span>{" "}
                  <span className="text-muted-foreground">{s.text}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

/** ZCG committee decisions about one grant, from meeting minutes. Renders nothing when none are found. */
export function CommitteeDecisionsCard({ forumLink, title }: { forumLink: string; title: string }) {
  const { text: tx } = useUi();
  const { data } = useQuery<DecisionsResponse>({
    queryKey: ["zcg-decisions", forumLink, title],
    queryFn: async () => {
      const params = new URLSearchParams({ forumLink, title });
      const res = await fetch(`/api/zcg/decisions?${params}`);
      if (!res.ok) throw new Error(`Decisions lookup failed (${res.status})`);
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
  });

  if (!data?.decisions.length) return null;
  const sorted = [...data.decisions].sort((a, b) => b.meetingDate.localeCompare(a.meetingDate));
  return (
    <Card className="mb-6">
      <CardHeader className="pb-1">
        <CardTitle className="flex items-center gap-2 text-base">
          <Gavel className="h-4 w-4 text-primary" /> {tx(" ZCG committee decisions")}</CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-border pt-0">
        {sorted.map((d, i) => (
          <DecisionEntry key={`${d.minutesTopicId}-${d.topicId}`} d={d} defaultOpen={i === 0} />
        ))}
        <p className="pt-3 text-xs text-muted-foreground">
          {tx("Parsed from the committee's published meeting minutes. The minutes are the authoritative record.")}</p>
      </CardContent>
    </Card>
  );
}
