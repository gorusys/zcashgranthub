import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DecisionEntry, type DecisionsResponse } from "@/components/CommitteeDecisions";
import { cn } from "@/lib/utils";
import type { ZcgOutcome } from "@/lib/zcgMinutes";

const PAGE = 30;
const FILTERS: Array<{ value: ZcgOutcome | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
  { value: "open", label: "Remains open" },
];

export default function DecisionsPage() {
  const { data, isLoading, isError, error } = useQuery<DecisionsResponse, Error>({
    queryKey: ["zcg-decisions", "all"],
    queryFn: async () => {
      const res = await fetch("/api/zcg/decisions?limit=2000");
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status})`);
      return body;
    },
    staleTime: 10 * 60 * 1000,
  });

  const [q, setQ] = useState("");
  const [outcome, setOutcome] = useState<ZcgOutcome | "all">("all");
  const [shown, setShown] = useState(PAGE);
  useEffect(() => setShown(PAGE), [q, outcome]);

  const all = useMemo(() => data?.decisions ?? [], [data]);

  // Latest decision per proposal: a proposal that "remains open" and is later
  // declined counts once, as declined.
  const latest = useMemo(() => {
    const m = new Map<number, (typeof all)[number]>();
    for (const d of all) {
      const prev = m.get(d.topicId);
      if (!prev || d.meetingDate > prev.meetingDate) m.set(d.topicId, d);
    }
    return [...m.values()];
  }, [all]);

  const stats = useMemo(() => {
    const decided = latest.filter((d) => d.outcome === "approved" || d.outcome === "declined");
    const approved = decided.filter((d) => d.outcome === "approved").length;
    return {
      proposals: latest.length,
      approved,
      declined: decided.length - approved,
      rate: decided.length ? Math.round((approved / decided.length) * 100) : null,
    };
  }, [latest]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all.filter(
      (d) =>
        (outcome === "all" || d.outcome === outcome) &&
        (!needle ||
          d.title.toLowerCase().includes(needle) ||
          d.summary.toLowerCase().includes(needle) ||
          d.statements.some((s) => s.text.toLowerCase().includes(needle) || s.member.toLowerCase() === needle))
    );
  }, [all, q, outcome]);

  return (
    <div className="container mx-auto min-w-0 px-4 py-6 sm:py-8">
      <Head>
        <title>ZCG decisions archive · Zcash Grants Hub</title>
        <meta
          name="description"
          content="Search Zcash Community Grants committee decisions and each member's stated reasoning, parsed from the published meeting minutes."
        />
      </Head>

      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          ZCG decisions archive
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground sm:text-base">
          What the Zcash Community Grants committee decided on each proposal, and why, in members'
          own words. Parsed from the meeting minutes the committee publishes on the forum. Search
          for your topic before applying to see what reviewers have said about similar work.
        </p>
      </div>

      {data && (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            ["Proposals discussed", stats.proposals.toLocaleString()],
            ["Approved", stats.approved.toLocaleString()],
            ["Declined", stats.declined.toLocaleString()],
            ["Approval rate", stats.rate == null ? "—" : `${stats.rate}%`],
          ].map(([label, value]) => (
            <Card key={label} className="border-border/50 bg-card">
              <CardContent className="p-5 text-center">
                <div className="text-2xl font-bold tabular-nums text-foreground sm:text-3xl">{value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{label}</div>
              </CardContent>
            </Card>
          ))}
          <p className="col-span-2 text-xs text-muted-foreground lg:col-span-4">
            From {data.meetings} meetings; latest decision per proposal. Approval rate counts only
            approved vs declined.
          </p>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search proposals and reasoning (e.g. wallet, explorer, marketing)"
            className="pl-9"
            aria-label="Search decisions"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={outcome === f.value}
              onClick={() => setOutcome(f.value)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                outcome === f.value
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <div className="h-40 animate-pulse rounded-lg bg-muted" />}
      {isError && (
        <p className="text-sm text-destructive">
          Couldn't load decisions: {error.message}. The forum may be rate-limiting; try again in a
          few minutes.
        </p>
      )}

      {data && (
        <Card className="border-border/50 bg-card">
          <CardContent className="divide-y divide-border py-1">
            {filtered.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No matching decisions.</p>
            )}
            {filtered.slice(0, shown).map((d) => (
              <DecisionEntry key={`${d.minutesTopicId}-${d.topicId}`} d={d} showTitle />
            ))}
          </CardContent>
        </Card>
      )}
      {filtered.length > shown && (
        <div className="mt-4 text-center">
          <Button variant="outline" onClick={() => setShown(shown + PAGE)}>
            Show more ({filtered.length - shown} left)
          </Button>
        </div>
      )}
    </div>
  );
}
