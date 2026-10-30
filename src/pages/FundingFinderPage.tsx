import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { ArrowRight, Compass, ExternalLink, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";
import {
  recommendFunding,
  SIZE_LABEL,
  type Fit,
  type WorkKind,
  type WorkSize,
  type WorkStage,
} from "@/lib/fundingFinder";
import { currentRound, nextMilestone, phaseLabel, roundPhase } from "@/lib/retroRounds";

type Option<T extends string> = { value: T; label: string; hint?: string };

const STAGES: Option<WorkStage>[] = [
  { value: "done", label: "Already done", hint: "Shipped and publicly verifiable" },
  { value: "partly", label: "Partly done", hint: "Some finished, more to build" },
  { value: "planned", label: "Not started", hint: "An idea or plan" },
];
const SIZES: Option<WorkSize>[] = (["small", "medium", "large"] as const).map((v) => ({
  value: v,
  label: SIZE_LABEL[v],
}));
const KINDS: Option<WorkKind>[] = [
  { value: "software", label: "Software / infrastructure", hint: "Wallets, SDKs, nodes, tools, integrations" },
  { value: "content", label: "Education / content", hint: "Guides, videos, translations, wiki" },
  { value: "community", label: "Community / events", hint: "Meetups, conferences, local groups" },
  { value: "security", label: "Security", hint: "Vulnerability reports, audits, fixes" },
  { value: "research", label: "Research", hint: "Protocol, cryptography, economics" },
];

const FIT_LABEL: Record<Fit, string> = { best: "Best fit", good: "Good fit", possible: "Also possible" };

function Choice<T extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: Option<T>[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-foreground">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-lg border p-3 text-left text-sm transition-colors",
              value === o.value
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
            )}
          >
            <div className="font-medium text-foreground">{o.label}</div>
            {o.hint && <div className="mt-0.5 text-xs">{o.hint}</div>}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export default function FundingFinderPage() {
  const [stage, setStage] = useState<WorkStage | null>(null);
  const [size, setSize] = useState<WorkSize | null>(null);
  const [kind, setKind] = useState<WorkKind | null>(null);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);

  const routes = useMemo(
    () => (stage && size && kind ? recommendFunding({ stage, size, kind }) : null),
    [stage, size, kind]
  );

  useEffect(() => {
    if (routes && stage && size && kind) {
      track("funding_finder_result", { stage, size, kind, top: routes[0]?.id ?? "none" });
    }
  }, [routes, stage, size, kind]);

  const round = now == null ? undefined : currentRound(undefined, now);
  const milestone = round && now != null ? nextMilestone(round, now) : null;

  return (
    <div className="container mx-auto min-w-0 max-w-4xl px-4 py-6 sm:py-8">
      <Head>
        <title>Find funding · Zcash Grants Hub</title>
        <meta
          name="description"
          content="Answer three questions to find which Zcash funding route fits your work: ZCG, Coinholder retroactive grants, ZecHub bounties or the ZecHub DAO."
        />
      </Head>

      <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
        <Compass className="h-7 w-7 text-primary" /> Find the right funding
      </h1>
      <p className="mb-6 mt-2 text-sm text-muted-foreground sm:text-base">
        Zcash has several funding routes with different rules. Answer three questions to see
        which ones fit your work and what to do next.
      </p>

      <Card className="mb-6">
        <CardContent className="space-y-5 p-5">
          <Choice<WorkStage> legend="1. Where is the work?" options={STAGES} value={stage} onChange={setStage} />
          <Choice<WorkSize> legend="2. Roughly how much funding?" options={SIZES} value={size} onChange={setSize} />
          <Choice<WorkKind> legend="3. What kind of work?" options={KINDS} value={kind} onChange={setKind} />
        </CardContent>
      </Card>

      {routes && (
        <div className="space-y-4" aria-live="polite">
          {routes.map((r) => {
            const external = r.href.startsWith("http");
            return (
              <Card key={r.id} className={cn(r.fit === "best" && "border-primary/50")}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-lg">{r.name}</CardTitle>
                    <Badge variant={r.fit === "best" ? "default" : "secondary"}>{FIT_LABEL[r.fit]}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {r.id === "coinholder" && round && milestone && now != null && (
                    <p className="rounded-md bg-primary/10 px-3 py-2 text-foreground">
                      {round.label}: {phaseLabel[roundPhase(round, now)].toLowerCase()}. Next:{" "}
                      {milestone.label.toLowerCase()} on{" "}
                      {new Date(milestone.at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "UTC",
                      })}{" "}
                      UTC.
                    </p>
                  )}
                  <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                    {r.why.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                  <div>
                    <div className="mb-1 font-medium text-foreground">Next steps</div>
                    <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
                      {r.steps.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ol>
                  </div>
                  <Button asChild size="sm" variant={r.fit === "best" ? "default" : "outline"}>
                    {external ? (
                      <a href={r.href} target="_blank" rel="noopener noreferrer">
                        {r.cta} <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <Link href={r.href}>
                        {r.cta} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Link>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}

          <p className="flex gap-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Guidance only. Each program makes its own decisions, and rules change, so check the
            program's latest forum posts before applying. Applying to more than one program is
            allowed for separate scopes; say so in each application.
          </p>
        </div>
      )}
    </div>
  );
}
