/** Shapes and pure helpers for repository activity signals. */

export interface ReleaseRef {
  tag: string;
  at: string;
  url: string;
}

export interface RepoStats {
  repo: string;
  /** False when GitHub says the repo doesn't exist (renamed, deleted, private). */
  exists: boolean;
  archived: boolean;
  stars: number;
  pushedAt: string | null;
  openIssues: number;
  latestRelease: ReleaseRef | null;
  /** Most recent of the last 10 releases whose name or notes mention NU7. */
  nu7Release: ReleaseRef | null;
  /** Distinct commit authors in the last 90 days (from up to 100 commits). */
  activeContributors90d: number;
  commits90d: number;
  /** True when the 90-day commit sample hit the 100-commit page cap. */
  commitsCapped: boolean;
  fetchedAt: string;
}

export interface GhRelease {
  tag_name: string;
  name: string | null;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
  published_at: string | null;
  html_url: string;
}

export interface GhCommit {
  author: { login: string } | null;
  commit: { author: { email?: string; name?: string } | null };
}

const NU7_RE = /\bNU\s?7\b|network upgrade 7/i;

export function summarizeReleases(releases: GhRelease[]): Pick<RepoStats, "latestRelease" | "nu7Release"> {
  const published = releases
    .filter((r) => !r.draft && r.published_at)
    .sort((a, b) => b.published_at!.localeCompare(a.published_at!));
  const ref = (r: GhRelease): ReleaseRef => ({ tag: r.tag_name, at: r.published_at!, url: r.html_url });
  const latest = published.find((r) => !r.prerelease) ?? published[0];
  const nu7 = published.find((r) => NU7_RE.test(`${r.name ?? ""}\n${r.body ?? ""}`));
  return { latestRelease: latest ? ref(latest) : null, nu7Release: nu7 ? ref(nu7) : null };
}

export function summarizeCommits(commits: GhCommit[]): Pick<RepoStats, "activeContributors90d" | "commits90d" | "commitsCapped"> {
  const authors = new Set(
    commits
      .map((c) => c.author?.login ?? c.commit.author?.email ?? c.commit.author?.name ?? "")
      .filter((a) => a && !/\[bot\]$|dependabot|github-actions/i.test(a))
  );
  return { activeContributors90d: authors.size, commits90d: commits.length, commitsCapped: commits.length >= 100 };
}

/** Day-rounded ISO timestamp `days` ago, so request URLs (and their ETags) stay stable within a day. */
export function sinceDaysAgo(days: number, now: number = Date.now()): string {
  const d = new Date(now - days * 86_400_000);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().replace(".000Z", "Z");
}

export type ActivityLevel = "active" | "quiet" | "dormant" | "unknown";

/** Plain activity bucket from the last push: <90 days active, <365 quiet, else dormant. */
export function activityLevel(pushedAt: string | null, now: number = Date.now()): ActivityLevel {
  if (!pushedAt) return "unknown";
  const days = (now - Date.parse(pushedAt)) / 86_400_000;
  return days < 90 ? "active" : days < 365 ? "quiet" : "dormant";
}
