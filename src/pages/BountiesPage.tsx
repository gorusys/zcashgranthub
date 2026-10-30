import { useMemo, useState } from "react";
import Head from "next/head";
import { useQuery } from "@tanstack/react-query";
import { Coins, ExternalLink, Github, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useZecUsdPrice } from "@/hooks/useZecUsdPrice";
import { cn } from "@/lib/utils";
import { GITHUB_ORGS, ZECHUB_BOUNTIES_SITE, type Opportunity } from "@/lib/opportunities";
import type { OpportunitiesSnapshot } from "@/lib/server/opportunitiesStore";

type Filter = "all" | "zechub" | "github";
const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "All" },
  { value: "zechub", label: "Paid ZEC bounties" },
  { value: "github", label: "Open-source issues" },
];

const daysAgo = (iso: string) => {
  const d = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
};

function OpportunityRow({ o, zecUsd }: { o: Opportunity; zecUsd: number | null }) {
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {o.source === "zechub" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 font-medium text-foreground">
            <Coins className="h-3 w-3 text-primary" /> ZecHub bounty
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 font-medium text-foreground">
            <Github className="h-3 w-3" /> {o.context}
          </span>
        )}
        {o.source === "zechub" && <span>{o.context}</span>}
        {o.difficulty && <span className="capitalize">· {o.difficulty}</span>}
        <span>· {daysAgo(o.createdAt)}</span>
        {o.amountZec != null && (
          <span className="ml-auto font-medium tabular-nums text-foreground">
            {o.amountZec} ZEC{zecUsd ? ` ≈ $${(o.amountZec * zecUsd).toFixed(2)}` : ""}
          </span>
        )}
      </div>
      <a
        href={o.url}
        target="_blank"
        rel="noopener noreferrer"
        dir="auto"
        className="mt-1 inline-flex items-start gap-1 font-medium text-foreground hover:text-primary"
      >
        {o.title} <ExternalLink className="mt-1 h-3 w-3 shrink-0" />
      </a>
      {o.summary && <p dir="auto" className="mt-0.5 text-sm text-muted-foreground">{o.summary}</p>}
      {o.labels.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {o.labels.slice(0, 5).map((l) => (
            <span key={l} className="rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground">
              {l}
            </span>
          ))}
        </div>
      )}
    </li>
  );
}

export default function BountiesPage() {
  const { data, isLoading, isError } = useQuery<OpportunitiesSnapshot>({
    queryKey: ["opportunities"],
    queryFn: async () => {
      const res = await fetch("/api/opportunities");
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      return res.json();
    },
    staleTime: 15 * 60 * 1000,
  });
  const price = useZecUsdPrice();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  const items = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data?.items ?? []).filter(
      (o) =>
        (filter === "all" || o.source === filter) &&
        (!needle ||
          o.title.toLowerCase().includes(needle) ||
          o.context.toLowerCase().includes(needle) ||
          o.labels.some((l) => l.toLowerCase().includes(needle)))
    );
  }, [data, filter, q]);

  const counts = useMemo(() => {
    const all = data?.items ?? [];
    return { zechub: all.filter((o) => o.source === "zechub").length, github: all.filter((o) => o.source === "github").length };
  }, [data]);

  return (
    <div className="container mx-auto min-w-0 max-w-4xl px-4 py-6 sm:py-8">
      <Head>
        <title>Bounties & first issues · Zcash Grants Hub</title>
        <meta
          name="description"
          content="Open ZEC bounties from ZecHub and beginner-friendly issues in Zebra, librustzcash, Zingo and other Zcash projects, in one list."
        />
      </Head>

      <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
        <Coins className="h-7 w-7 text-primary" /> Bounties &amp; first issues
      </h1>
      <p className="mb-6 mt-2 text-sm text-muted-foreground sm:text-base">
        Small, well-defined ways to start contributing: open, unclaimed bounties paid in shielded
        ZEC on{" "}
        <a href={ZECHUB_BOUNTIES_SITE} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          ZecHub
        </a>
        , and unassigned issues labelled "good first issue", "help wanted" or "bounty" in{" "}
        {GITHUB_ORGS.join(", ")} on GitHub. Claim or comment on the source site before starting.
      </p>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by title, repo, label or category"
            className="pl-9"
            aria-label="Search bounties and issues"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                filter === f.value
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
              {f.value !== "all" && data ? ` (${counts[f.value]})` : ""}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <div className="h-40 animate-pulse rounded-lg bg-muted" />}
      {isError && <p className="text-sm text-destructive">Couldn't load opportunities. Try again shortly.</p>}
      {data && Object.keys(data.errors).length > 0 && (
        <p className="mb-3 text-xs text-muted-foreground">
          Some sources are temporarily unavailable ({Object.keys(data.errors).join(", ")}); showing what loaded.
        </p>
      )}

      {data && (
        <Card>
          <CardContent className="py-1">
            {items.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nothing open matches right now.</p>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((o) => (
                  <OpportunityRow key={o.id} o={o} zecUsd={price.usd} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
