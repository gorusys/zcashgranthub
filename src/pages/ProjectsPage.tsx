import { useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Boxes, ChevronDown, ExternalLink, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { programLabel } from "@/lib/grantPrograms";
import type { CoreRepoFunding, Project } from "@/lib/projects";
import { activityLevel, type ActivityLevel, type RepoStats } from "@/lib/repoStats";
import { cn } from "@/lib/utils";

type ProjectsResponse = { fetchedAt: string; projects: Project[]; core: CoreRepoFunding[] };
type StatsResponse = { stats: Record<string, RepoStats | null> };

const usd = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
const LOW_MAINTAINERS = 2;

const ACTIVITY: Record<ActivityLevel, { label: string; className: string }> = {
  active: { label: "Active", className: "text-emerald-500" },
  quiet: { label: "Quiet", className: "text-yellow-500" },
  dormant: { label: "Dormant", className: "text-muted-foreground" },
  unknown: { label: "—", className: "text-muted-foreground" },
};

async function fetchStats(repos: string[]): Promise<StatsResponse> {
  const res = await fetch(`/api/repos?repos=${encodeURIComponent(repos.join(","))}`);
  if (!res.ok) throw new Error(`Repo stats failed (${res.status})`);
  return res.json();
}

function Activity({ s }: { s: RepoStats | null | undefined }) {
  if (!s) return <span className="text-xs text-muted-foreground">Not loaded yet</span>;
  if (!s.exists) return <span className="text-xs text-muted-foreground">Not found</span>;
  const level = s.archived ? "dormant" : activityLevel(s.pushedAt);
  return (
    <span className="text-xs">
      <span className={cn("font-medium", ACTIVITY[level].className)}>{s.archived ? "Archived" : ACTIVITY[level].label}</span>
      {s.pushedAt && <span className="text-muted-foreground"> · pushed {shortDate(s.pushedAt)}</span>}
    </span>
  );
}

function CoreTable({ core }: { core: CoreRepoFunding[] }) {
  const repos = core.map((c) => c.repo);
  const { data, isLoading } = useQuery({ queryKey: ["repo-stats", "core"], queryFn: () => fetchStats(repos), staleTime: 60 * 60 * 1000 });
  const stats = data?.stats ?? {};
  const loaded = repos.filter((r) => stats[r]?.exists);
  const nu7 = loaded.filter((r) => stats[r]!.nu7Release).length;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Core infrastructure</CardTitle>
        <p className="text-sm text-muted-foreground">
          The repositories wallets and nodes depend on: how active they are, whether a recent
          release mentions NU7, and how many people committed in the last 90 days. Few active
          maintainers on critical code is a funding gap worth knowing about.
          {loaded.length > 0 && (
            <>
              {" "}
              <span className="font-medium text-foreground">
                {nu7} of {loaded.length}
              </span>{" "}
              have a recent release mentioning NU7.
            </>
          )}
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Activity</TableHead>
              <TableHead>Latest release</TableHead>
              <TableHead>NU7 in releases</TableHead>
              <TableHead className="text-right">Committers (90d)</TableHead>
              <TableHead className="text-right">Linked grants</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {core.map((c) => {
              const s = stats[c.repo];
              const low = s?.exists && !s.archived && s.activeContributors90d <= LOW_MAINTAINERS;
              return (
                <TableRow key={c.repo}>
                  <TableCell>
                    <a href={`https://github.com/${c.repo}`} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:text-primary">
                      {c.name}
                    </a>
                    <div className="text-xs text-muted-foreground">
                      {c.role} · {c.desc}
                    </div>
                  </TableCell>
                  <TableCell>{isLoading ? <span className="text-xs text-muted-foreground">Loading…</span> : <Activity s={s} />}</TableCell>
                  <TableCell className="text-xs">
                    {s?.latestRelease ? (
                      <a href={s.latestRelease.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                        {s.latestRelease.tag}
                        <div className="text-muted-foreground">{shortDate(s.latestRelease.at)}</div>
                      </a>
                    ) : (
                      <span className="text-muted-foreground">{s ? "No releases" : "—"}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {s?.nu7Release ? (
                      <a href={s.nu7Release.url} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline">
                        {s.nu7Release.tag}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">{s ? "Not mentioned" : "—"}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">
                    {s?.exists ? (
                      <span className={cn("inline-flex items-center gap-1", low && "text-yellow-500")}>
                        {low && <AlertTriangle className="h-3.5 w-3.5" aria-label="Few active maintainers" />}
                        {s.activeContributors90d}
                        {s.commitsCapped ? "+" : ""}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{c.grantIds.length || "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <p className="mt-3 text-xs text-muted-foreground">
          From GitHub, refreshed daily. "NU7 in releases" means one of the last ten releases names
          NU7 in its title or notes: a signal, not a guarantee of compatibility. Committers counts
          distinct non-bot authors across up to 100 recent commits on the default branch.
          {repos.some((r) => !stats[r]) && !isLoading && " Rows without data are waiting on GitHub's rate limit and fill in on a later visit."}
        </p>
      </CardContent>
    </Card>
  );
}

function ProjectRow({ p }: { p: Project }) {
  const [open, setOpen] = useState(false);
  const repos = p.repos.slice(0, 30);
  const { data, isFetching } = useQuery({
    queryKey: ["repo-stats", p.owner, repos],
    queryFn: () => fetchStats(repos),
    enabled: open && repos.length > 0,
    staleTime: 60 * 60 * 1000,
  });

  return (
    <li className="py-3">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-3 text-left">
        <img src={p.avatar} alt="" className="h-8 w-8 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1">
          <div className="font-medium text-foreground">@{p.owner}</div>
          <div className="truncate text-xs text-muted-foreground">
            {p.grants.length} funded grant{p.grants.length === 1 ? "" : "s"} · {p.categories.join(", ")}
          </div>
        </div>
        <div className="text-right text-sm tabular-nums">
          <div className="font-medium text-foreground">{usd(p.fundedUsd)}</div>
          <div className="text-xs text-muted-foreground">{usd(p.paidUsd)} paid</div>
        </div>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-3 space-y-3 pl-11">
          <ul className="space-y-1.5 text-sm">
            {p.grants.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">{programLabel(g.program)}</span>
                <Link href={`/grants/${g.id}`} className="min-w-0 flex-1 text-foreground hover:text-primary">
                  {g.title}
                </Link>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {usd(g.amountUsd)}
                  {g.paidUsd > 0 && g.paidUsd < g.amountUsd ? ` (${usd(g.paidUsd)} paid)` : ""}
                </span>
                <StatusBadge status={g.status} />
              </li>
            ))}
          </ul>
          {repos.length > 0 ? (
            <div>
              <div className="mb-1 text-xs font-medium text-muted-foreground">Repositories linked in applications</div>
              <ul className="space-y-1">
                {repos.map((r) => (
                  <li key={r} className="flex flex-wrap items-center gap-2 text-sm">
                    <a href={`https://github.com/${r}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-foreground hover:text-primary">
                      {r} <ExternalLink className="h-3 w-3" />
                    </a>
                    {isFetching && !data ? <span className="text-xs text-muted-foreground">Loading…</span> : <Activity s={data?.stats[r]} />}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No GitHub repositories linked in these applications.</p>
          )}
        </div>
      )}
    </li>
  );
}

export default function ProjectsPage() {
  const { data, isLoading, isError, error } = useQuery<ProjectsResponse, Error>({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status})`);
      return body;
    },
    staleTime: 10 * 60 * 1000,
  });
  const [q, setQ] = useState("");
  const projects = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data?.projects ?? []).filter(
      (p) =>
        !needle ||
        p.owner.toLowerCase().includes(needle) ||
        p.grants.some((g) => g.title.toLowerCase().includes(needle)) ||
        p.repos.some((r) => r.toLowerCase().includes(needle))
    );
  }, [data, q]);

  const totals = useMemo(() => {
    const ps = data?.projects ?? [];
    return { teams: ps.length, funded: ps.reduce((s, p) => s + p.fundedUsd, 0), paid: ps.reduce((s, p) => s + p.paidUsd, 0) };
  }, [data]);

  return (
    <div className="container mx-auto min-w-0 max-w-5xl px-4 py-6 sm:py-8">
      <Head>
        <title>Projects & infrastructure · Zcash Grants Hub</title>
        <meta
          name="description"
          content="Who has been funded to build what in Zcash, the repositories behind each grant, and the health and NU7 readiness of core infrastructure."
        />
      </Head>
      <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
        <Boxes className="h-7 w-7 text-primary" /> Projects &amp; infrastructure
      </h1>
      <p className="mb-6 mt-2 text-sm text-muted-foreground sm:text-base">
        Funded work across ZCG and Coinholder grants, grouped by team, with the code it links to.
        Use it to check a team's track record, find who maintains what, and spot critical code
        with few maintainers.
      </p>

      {isError && <p className="mb-4 text-sm text-destructive">Couldn't load projects: {error.message}</p>}
      {isLoading && <div className="mb-6 h-60 animate-pulse rounded-lg bg-muted" />}
      {data && <CoreTable core={data.core} />}

      {data && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Funded teams</CardTitle>
            <p className="text-sm text-muted-foreground">
              {totals.teams} teams · {usd(totals.funded)} funded · {usd(totals.paid)} recorded as paid.
              Amounts are parsed from applications and GitHub labels; the program spreadsheets
              and OpenZcash are the accounting record.
            </p>
          </CardHeader>
          <CardContent>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by team, grant or repository" className="pl-9" aria-label="Search projects" />
            </div>
            <ul className="divide-y divide-border">
              {projects.map((p) => (
                <ProjectRow key={p.owner} p={p} />
              ))}
            </ul>
            {projects.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No matching teams.</p>}
          </CardContent>
        </Card>
      )}
      {data && (
        <div className="mt-4 text-right">
          <Button asChild variant="link" size="sm">
            <a href="https://openzcash.org/zcg" target="_blank" rel="noopener noreferrer">
              Payment ledger on OpenZcash <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
