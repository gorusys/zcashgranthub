import { useUi } from "@/i18n/useUi";
import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  FileText,
  Megaphone,
  Scale,
  Vote,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { useGrants } from "@/hooks/useGrants";
import { cn } from "@/lib/utils";
import {
  currentRound,
  nextMilestone,
  OPENZCASH_RETRO_RESULTS_URL,
  OPENZCASH_RETRO_VERIFY_URL,
  phaseLabel,
  RETRO_FORUM_CATEGORY_URL,
  RETRO_GITHUB_NEW_ISSUE_URL,
  RETRO_KYC_THRESHOLD_USD,
  RETRO_QUORUM_ZEC,
  RETRO_ROUNDS,
  retroOutcome,
  roundPhase,
  statsForRounds,
  type RetroAnnouncement,
  type RetroPhase,
  type RetroRound,
} from "@/lib/retroRounds";

const VOTE_ANALYSIS_THREAD = "https://forum.zcashcommunity.com/t/57910";
const ZODL_VOTING_GUIDE_URL = "https://zodl.com/zodl-3-5-0-vote-with-your-zec/";
const CIPHERSCAN_GOVERNANCE_URL = "https://cipherscan.app/governance";

const usd = (locale: string, n: number) =>
  n.toLocaleString(locale, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const fmtDate = (locale: string, iso: string) =>
  new Date(iso).toLocaleString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });

function fmtCountdown(ms: number): string {
  const mins = Math.max(0, Math.floor(ms / 60_000));
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Client clock, ticking once a minute. `null` until mounted to avoid SSR mismatch. */
function useNow(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const PHASE_ORDER: RetroPhase[] = [
  "submissions",
  "review",
  "voting",
  "closed",
];

function phaseStepIndex(phase: RetroPhase): number {
  switch (phase) {
    case "upcoming":
      return -1;
    case "submissions":
      return 0;
    case "awaiting_review":
    case "review":
      return 1;
    case "awaiting_vote":
    case "voting":
      return 2;
    default:
      return 3;
  }
}

function RoundTimeline({ round, phase }: { round: RetroRound; phase: RetroPhase }) {
  const { text: tx, locale: uiLocale } = useUi();
  const active = phaseStepIndex(phase);
  const steps = [
    { title: "Submissions", from: round.submissionsOpen, to: round.submissionDeadline },
    { title: "30-day review", from: round.reviewStart, to: round.reviewEnd },
    { title: "Coinholder vote", from: round.votingStart, to: round.votingEnd },
    { title: "Results & payout", from: round.votingEnd },
  ];
  return (
    <ol className="grid gap-3 sm:grid-cols-4">
      {steps.map((s, i) => (
        <li
          key={PHASE_ORDER[i]}
          className={cn(
            "rounded-lg border p-3 text-sm",
            i === active
              ? "border-primary bg-primary/10"
              : i < active
                ? "border-border/60 opacity-70"
                : "border-border"
          )}
        >
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            {i < active && <CheckCircle2 className="h-4 w-4 text-primary" />}
            {tx(s.title)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {tx(s.from && s.to
              ? `${fmtDate(uiLocale, s.from)} – ${fmtDate(uiLocale, s.to)}`
              : s.from
                ? `After ${fmtDate(uiLocale, s.from)}`
                : "TBA")}
          </div>
        </li>
      ))}
    </ol>
  );
}

const checklist = (locale: string): Array<{ title: string; body: string }> => [
  {
    title: "Completed, verifiable work only",
    body: "Planned or partially completed work is not eligible. Intended users (or their representatives) confirm the outputs before the proposal goes on the ballot. Planned work belongs in a ZCG application.",
  },
  {
    title: "Two places: GitHub + forum",
    body: "Fill the FPF GitHub template, then paste it into a new thread in the Community Grants › Retroactive Grants forum category so people can review it.",
  },
  {
    title: "Show evidence and usage",
    body: "Link repos, releases, deployments, and real usage numbers. Coinholders vote on demonstrated impact, and rejections usually come without written reasons.",
  },
  {
    title: `KYC above ${usd(locale, RETRO_KYC_THRESHOLD_USD)}`,
    body: "Requests above the threshold require KYC with FPF before payout.",
  },
  {
    title: "Valued in USD, paid in shielded ZEC",
    body: "The ZEC amount is set by the ZEC/USD rate at the time of payment.",
  },
  {
    title: "Open-source hygiene",
    body: "New open-source software needs a CONTRIBUTING.md modeled on librustzcash; contributions to existing Zcash code follow that project's merge, branch, PR and commit rules. Disclose conflicts of interest.",
  },
  {
    title: "Be present during review",
    body: "Answer questions in your forum thread during the mandatory 30-day review period.",
  },
  {
    title: "Your ballot text is frozen",
    body: "Voters see the application as submitted, and it can't be edited once voting opens. Put final, current numbers in it before the review period ends.",
  },
  {
    title: "How a vote passes",
    body: `At least ${RETRO_QUORUM_ZEC.toLocaleString(locale)} ZEC must be voted on the proposal (any answer), and a simple majority of that must be Approve. Each proposal is voted on independently.`,
  },
];

export default function RetroRoundsPage() {
  const { text: tx, locale: uiLocale } = useUi();
  const now = useNow();
  const { data: grants = [], isLoading } = useGrants();
  const { data: feed } = useQuery<{ announcements: RetroAnnouncement[] }>({
    queryKey: ["retro-announcements"],
    queryFn: async () => {
      const res = await fetch("/api/forum/retro-announcements");
      if (!res.ok) throw new Error(`Forum feed failed (${res.status})`);
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
  });

  const round = now == null ? undefined : currentRound(RETRO_ROUNDS, now);
  const phase = round && now != null ? roundPhase(round, now) : null;
  const milestone = round && now != null ? nextMilestone(round, now) : null;

  const stats = useMemo(() => statsForRounds(grants), [grants]);
  const current = round ? stats.get(round.id) : undefined;
  const pastRounds = RETRO_ROUNDS.filter(
    (r) => now != null && r.id !== round?.id && roundPhase(r, now) === "closed"
  ).reverse();

  return (
    <div className="container mx-auto min-w-0 px-4 py-6 sm:py-8">
      <Head>
        <title>{tx("Coinholder retro rounds · Zcash Grants Hub")}</title>
        <meta
          name="description"
          content={tx("Deadlines, phases, checklist and past results for the Zcash Coinholder-Directed Retroactive Grants Program (ZIP 1016).")}
        />
      </Head>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          {tx("Coinholder retro grant rounds")}</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground sm:text-base">
          {tx("The Coinholder-Directed Retroactive Grants Program (ZIP 1016) pays for work that is already done. It runs in quarterly rounds administered by the Financial Privacy Foundation, and ZEC holders decide by shielded vote. Dates below come from FPF's forum announcements.")}</p>
      </div>

      {/* Current round */}
      <Card className="mb-6 border-primary/40">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <CalendarClock className="h-5 w-5 text-primary" />
              {tx(round ? `${round.label} round` : "Current round")}
            </CardTitle>
            {phase && (
              <Badge variant={phase === "submissions" || phase === "voting" ? "default" : "secondary"}>
                {tx(phaseLabel[phase])}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {round && phase ? (
            <>
              {milestone && now != null && (
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-3xl font-bold tabular-nums text-foreground">
                    {tx(fmtCountdown(Date.parse(milestone.at) - now))}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {tx("until ")}{tx(milestone.label.toLowerCase())} ({tx(fmtDate(uiLocale, milestone.at))})
                  </span>
                </div>
              )}
              <RoundTimeline round={round} phase={phase} />
              {round.note && <p className="text-xs text-muted-foreground">{tx(round.note)}</p>}
              <div className="flex flex-wrap gap-2">
                {(phase === "submissions" || phase === "upcoming") && (
                  <>
                    <Button asChild>
                      <Link href="/apply?tab=coinholder">
                        <FileText className="mr-1.5 h-4 w-4" /> {tx(" Start application")}</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <a href={RETRO_GITHUB_NEW_ISSUE_URL} target="_blank" rel="noopener noreferrer">
                        {tx("GitHub template ")}<ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </>
                )}
                <Button asChild variant="outline">
                  <a href={RETRO_FORUM_CATEGORY_URL} target="_blank" rel="noopener noreferrer">
                    {tx("Retroactive Grants forum ")}<ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                  </a>
                </Button>
                {round.resultsUrl && (
                  <Button asChild variant="outline">
                    <a href={round.resultsUrl} target="_blank" rel="noopener noreferrer">
                      {tx("Results ")}<ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                    </a>
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {tx("Sources:")}{" "}
                {round.sources.map((s, i) => (
                  <span key={s}>
                    {tx(i > 0 && ", ")}
                    <a href={s} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
                      {tx("forum post ")}{i + 1}
                    </a>
                  </span>
                ))}
                {tx(". Always confirm against the latest FPF post.")}</p>
            </>
          ) : (
            <div className="h-32 animate-pulse rounded-lg bg-muted" />
          )}
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        {/* Checklist */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="h-5 w-5 text-primary" /> {tx(" Before you submit")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-4 sm:grid-cols-2">
              {checklist(uiLocale).map((c) => (
                <li key={c.title}>
                  <div className="text-sm font-medium text-foreground">{tx(c.title)}</div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{tx(c.body)}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Announcements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Megaphone className="h-5 w-5 text-primary" /> {tx(" Organizer announcements")}</CardTitle>
          </CardHeader>
          <CardContent>
            {feed?.announcements?.length ? (
              <ul className="space-y-3">
                {feed.announcements.slice(0, 8).map((a) => (
                  <li key={a.id} className="text-sm">
                    <a
                      href={a.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-foreground hover:text-primary"
                    >
                      {a.title}
                    </a>
                    <div className="text-xs text-muted-foreground">
                      {new Date(a.createdAt).toLocaleDateString(uiLocale)}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                {tx("Loading forum posts… or browse the")}{" "}
                <a href={RETRO_FORUM_CATEGORY_URL} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  {tx("forum category")}</a>
                .
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* This round's submissions */}
      {round && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">
              {tx(round.label)} {tx(" submissions")}{" "}
              {current && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({current.grants.filter((g) => retroOutcome(g) !== "not_voted").length})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-24 animate-pulse rounded-lg bg-muted" />
            ) : current && current.grants.some((g) => retroOutcome(g) !== "not_voted") ? (
              <ul className="divide-y divide-border">
                {current.grants
                  .filter((g) => retroOutcome(g) !== "not_voted")
                  .sort((a, b) => b.submittedDate.localeCompare(a.submittedDate))
                  .map((g) => (
                    <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                      <Link href={`/grants/${g.id}`} className="min-w-0 flex-1 text-sm font-medium text-foreground hover:text-primary">
                        {g.title}
                      </Link>
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {tx(g.amount > 0 ? usd(uiLocale, g.amount) : "—")}
                      </span>
                      <StatusBadge status={g.status} />
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                {tx("No submissions on GitHub for this round yet.")}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Past rounds */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Vote className="h-5 w-5 text-primary" /> {tx(" Past rounds")}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tx("Round")}</TableHead>
                <TableHead className="text-right">{tx("On ballot")}</TableHead>
                <TableHead className="text-right">{tx("Funded")}</TableHead>
                <TableHead className="text-right">{tx("Rejected")}</TableHead>
                <TableHead className="text-right">{tx("Requested")}</TableHead>
                <TableHead className="text-right">{tx("Funded (USD)")}</TableHead>
                <TableHead className="text-right">{tx("Funded by value")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pastRounds.map((r) => {
                const s = stats.get(r.id);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{tx(r.label)}</TableCell>
                    <TableCell className="text-right tabular-nums">{s?.onBallot ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{s?.funded ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s ? s.rejected + s.vetoed : "—"}
                      {s && s.vetoed > 0 && (
                        <span className="text-xs text-muted-foreground"> ({s.vetoed} {tx(" vetoed)")}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{tx(s ? usd(uiLocale, s.requestedUsd) : "—")}</TableCell>
                    <TableCell className="text-right tabular-nums">{tx(s ? usd(uiLocale, s.fundedUsd) : "—")}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {tx(s && s.requestedUsd > 0
                        ? `${Math.round((s.fundedUsd / s.requestedUsd) * 100)}%`
                        : "—")}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.resultsUrl && (
                        <a href={r.resultsUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                          {tx("Results")}</a>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <p className="mt-3 text-xs text-muted-foreground">
            {tx("Counts come from FPF's GitHub labels. USD amounts are parsed from each application, so they can differ slightly from FPF's published totals.")}{tx(RETRO_ROUNDS.some((r) => r.status === "postponed") &&
              " Q2 2026 was postponed and its submissions were voted on in Q3.")}
          </p>
        </CardContent>
      </Card>

      {/* How to vote */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Vote className="h-5 w-5 text-primary" /> {tx(" How to vote (ZEC holders)")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              <span className="font-medium text-foreground">{tx("Hold shielded ZEC in a wallet that supports voting")}</span>{" "}
              {tx("before the eligibility snapshot. Recent polls have run in Zodl (including Keystone through Zodl), Zkool and Vizor. Each round's announcement gives the snapshot and which funds count.")}</li>
            <li>
              <span className="font-medium text-foreground">{tx("Vote during the voting window")}</span> {tx(" from your wallet's voting section. Each proposal is a separate question; either \"Reject\" option counts as a no.")}</li>
            <li>
              <span className="font-medium text-foreground">{tx("Every answer counts toward quorum.")}</span>{" "}
              {tx("A proposal needs ")}{RETRO_QUORUM_ZEC.toLocaleString(uiLocale)} {tx(" ZEC voted on it (any answer) before a simple majority of Approve can pass it, so abstaining still helps a vote count.")}</li>
            <li>
              <span className="font-medium text-foreground">{tx("Your vote stays private.")}</span> {tx(" Votes are encrypted; the published tallies can be checked independently.")}</li>
          </ol>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={ZODL_VOTING_GUIDE_URL} target="_blank" rel="noopener noreferrer">
                {tx("Zodl voting guide ")}<ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={CIPHERSCAN_GOVERNANCE_URL} target="_blank" rel="noopener noreferrer">
                {tx("Upcoming votes & results (CipherScan) ")}<ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Learn from votes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Scale className="h-5 w-5 text-primary" /> {tx(" Learn from past votes")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            {tx("Coinholder rejections don't come with written reasons. The shape of the vote is the best signal: a low Accept share with little \"lower amount\" support usually means the project wasn't backed at all, while a large \"lower amount\" share points to pricing.")}</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={OPENZCASH_RETRO_RESULTS_URL} target="_blank" rel="noopener noreferrer">
                {tx("Per-proposal tallies (OpenZcash) ")}<ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={OPENZCASH_RETRO_VERIFY_URL} target="_blank" rel="noopener noreferrer">
                {tx("Verify the count yourself ")}<ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={VOTE_ANALYSIS_THREAD} target="_blank" rel="noopener noreferrer">
                {tx("Q3 vote analysis thread ")}<ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
