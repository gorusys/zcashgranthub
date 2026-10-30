import { useUi } from "@/i18n/useUi";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Grant } from "@/data/grantTypes";
import { isFunded, paidUsd } from "@/lib/projects";
import { reposForGrant } from "@/lib/repoLinks";
import { activityLevel, type RepoStats } from "@/lib/repoStats";

const usd = (locale: string, n: number) => n.toLocaleString(locale, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const MAX_REPOS = 10;

function daysSince(iso: string) {
  return Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
}

/**
 * Factual delivery signals for a funded grant: payout progress, recency of
 * updates, and activity on the repositories its application links.
 */
export function DeliverySignalsCard({ grant }: { grant: Grant }) {
  const { text: tx, locale: uiLocale } = useUi();
  const repos = useMemo(() => reposForGrant(grant).slice(0, MAX_REPOS), [grant]);
  const { data } = useQuery<{ stats: Record<string, RepoStats | null> }>({
    queryKey: ["repo-stats", "grant", grant.id, repos],
    queryFn: async () => {
      const res = await fetch(`/api/repos?repos=${encodeURIComponent(repos.join(","))}`);
      if (!res.ok) throw new Error(`Repo stats failed (${res.status})`);
      return res.json();
    },
    enabled: repos.length > 0,
    staleTime: 60 * 60 * 1000,
  });

  if (!isFunded(grant)) return null;
  const paid = paidUsd(grant);
  const pct = grant.amount > 0 ? Math.min(100, Math.round((paid / grant.amount) * 100)) : 0;
  const quiet = daysSince(grant.lastUpdated);

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-primary" /> {tx(" Delivery signals")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <div className="text-xs text-muted-foreground">{tx("Paid out")}</div>
            <div className="font-medium tabular-nums text-foreground">
              {tx(usd(uiLocale, paid))} {tx(" of ")}{tx(usd(uiLocale, grant.amount))}
            </div>
            <Progress value={pct} className="mt-1.5 h-1.5" aria-label={tx(`${pct}% paid`)} />
          </div>
          {grant.program === "zcg" && grant.totalMilestones > 0 && (
            <div>
              <div className="text-xs text-muted-foreground">{tx("Milestones paid")}</div>
              <div className="font-medium tabular-nums text-foreground">
                {grant.milestonesCompleted} {tx(" of ")}{grant.totalMilestones}
              </div>
            </div>
          )}
          <div>
            <div className="text-xs text-muted-foreground">{tx("Last update on the application")}</div>
            <div className="font-medium text-foreground">
              {quiet === 0 ? tx("Today") : tx(quiet === 1 ? "{0} day ago" : "{0} days ago", { 0: quiet })}
            </div>
          </div>
        </div>

        {repos.length > 0 && (
          <div>
            <div className="mb-1.5 text-xs font-medium text-muted-foreground">{tx("Repositories linked in the application")}</div>
            <ul className="space-y-1.5">
              {repos.map((r) => {
                const s = data?.stats[r];
                const level = s?.exists ? (s.archived ? "dormant" : activityLevel(s.pushedAt)) : "unknown";
                return (
                  <li key={r} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <a href={`https://github.com/${r}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-foreground hover:text-primary">
                      {tx(r)} <ExternalLink className="h-3 w-3" />
                    </a>
                    <span className="text-xs text-muted-foreground">
                      {tx(!s
                        ? "activity not loaded yet"
                        : !s.exists
                          ? "not found (renamed, private or deleted)"
                          : [
                              tx(s.archived ? "archived" : level === "active" ? "active" : level === "quiet" ? "quiet" : "no pushes in a year"),
                              s.pushedAt && tx("last push {0}", { 0: new Date(s.pushedAt).toLocaleDateString(uiLocale) }),
                              s.latestRelease && tx("release {0}", { 0: s.latestRelease.tag }),
                              tx(s.activeContributors90d === 1 ? "{0} committer in 90 days" : "{0} committers in 90 days", { 0: `${s.activeContributors90d}${s.commitsCapped ? "+" : ""}` }),
                            ]
                              .filter(Boolean)
                              .join(" · "))}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {tx("Facts from GitHub, not a judgement: repositories can move, and some work (events, research, content) leaves no code trail. Milestone reports on the forum are the record.")}</p>
      </CardContent>
    </Card>
  );
}
