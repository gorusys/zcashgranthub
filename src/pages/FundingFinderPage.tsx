import { useUi } from "@/i18n/useUi";
import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { ArrowRight, Compass, ExternalLink, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";
import { useT, type MessageKey } from "@/i18n";
import {
  recommendFunding,
  type WorkKind,
  type WorkSize,
  type WorkStage,
} from "@/lib/fundingFinder";
import { currentRound, nextMilestone, roundPhase } from "@/lib/retroRounds";

type Option<T extends string> = { value: T; label: string; hint?: string };

const STAGES: WorkStage[] = ["done", "partly", "planned"];
const SIZES: WorkSize[] = ["small", "medium", "large"];
const KINDS: WorkKind[] = ["software", "content", "community", "security", "research"];

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
  const { text: tx } = useUi();
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-foreground">{tx(legend)}</legend>
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
            <div className="font-medium text-foreground">{tx(o.label)}</div>
            {o.hint && <div className="mt-0.5 text-xs">{tx(o.hint)}</div>}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export default function FundingFinderPage() {
  const { text: tx, locale: uiLocale } = useUi();
  const [stage, setStage] = useState<WorkStage | null>(null);
  const [size, setSize] = useState<WorkSize | null>(null);
  const [kind, setKind] = useState<WorkKind | null>(null);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);
  const { t, locale } = useT();

  const stageOptions: Option<WorkStage>[] = STAGES.map((v) => ({
    value: v,
    label: t(`finder.stage.${v}` as MessageKey),
    hint: t(`finder.stage.${v}.hint` as MessageKey),
  }));
  const sizeOptions: Option<WorkSize>[] = SIZES.map((v) => ({ value: v, label: t(`finder.size.${v}` as MessageKey) }));
  const kindOptions: Option<WorkKind>[] = KINDS.map((v) => ({
    value: v,
    label: t(`finder.kind.${v}` as MessageKey),
    hint: t(`finder.kind.${v}.hint` as MessageKey),
  }));

  const routes = useMemo(
    () => (stage && size && kind ? recommendFunding({ stage, size, kind }, t) : null),
    [stage, size, kind, t]
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
        <title>{tx(`${t("finder.title")} · Zcash Grants Hub`)}</title>
        <meta
          name="description"
          content={tx("Answer three questions to find which Zcash funding route fits your work: ZCG, Coinholder retroactive grants, ZecHub bounties or the ZecHub DAO.")}
        />
      </Head>

      <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
        <Compass className="h-7 w-7 text-primary" /> {t("finder.title")}
      </h1>
      <p className="mb-6 mt-2 text-sm text-muted-foreground sm:text-base">
        {t("finder.intro")}
      </p>

      <Card className="mb-6">
        <CardContent className="space-y-5 p-5">
          <Choice<WorkStage> legend={t("finder.q1")} options={stageOptions} value={stage} onChange={setStage} />
          <Choice<WorkSize> legend={t("finder.q2")} options={sizeOptions} value={size} onChange={setSize} />
          <Choice<WorkKind> legend={t("finder.q3")} options={kindOptions} value={kind} onChange={setKind} />
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
                    <Badge variant={r.fit === "best" ? "default" : "secondary"}>{t(`finder.fit.${r.fit}` as MessageKey)}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {r.id === "coinholder" && round && milestone && now != null && (
                    <p className="rounded-md bg-primary/10 px-3 py-2 text-foreground">
                      {t("finder.roundNote", {
                        round: tx(round.label),
                        phase: t(`retro.phase.${roundPhase(round, now)}` as MessageKey),
                        milestone: t(`retro.ms.${milestone.label}` as MessageKey),
                        date: new Date(milestone.at).toLocaleString(uiLocale, {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "UTC",
                        }),
                      })}
                    </p>
                  )}
                  <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                    {r.why.map((w) => (
                      <li key={w}>{tx(w)}</li>
                    ))}
                  </ul>
                  <div>
                    <div className="mb-1 font-medium text-foreground">{t("finder.nextSteps")}</div>
                    <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
                      {r.steps.map((s) => (
                        <li key={s}>{tx(s)}</li>
                      ))}
                    </ol>
                  </div>
                  <Button asChild size="sm" variant={r.fit === "best" ? "default" : "outline"}>
                    {external ? (
                      <a href={r.href} target="_blank" rel="noopener noreferrer">
                        {tx(r.cta)} <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <Link href={r.href}>
                        {tx(r.cta)} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Link>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}

          <p className="flex gap-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {t("finder.disclaimer")}
          </p>
        </div>
      )}
    </div>
  );
}
