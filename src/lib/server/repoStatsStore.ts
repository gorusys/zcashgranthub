/**
 * Repository activity for core infrastructure and grant deliverables, cached for
 * 24 hours in memory and on disk (REPO_STATS_CACHE_PATH). Uses conditional
 * requests; stops early and serves cached values when GitHub rate-limits.
 */
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { githubGet } from "@/lib/github";
import {
  sinceDaysAgo,
  summarizeCommits,
  summarizeReleases,
  type GhCommit,
  type GhRelease,
  type RepoStats,
} from "@/lib/repoStats";

const TTL_MS = 24 * 60 * 60 * 1000;
const CONCURRENCY = 3;

let cache: Record<string, RepoStats> | null = null;
const inflight = new Map<string, Promise<RepoStats | null>>();

const cachePath = () => process.env.REPO_STATS_CACHE_PATH || path.join(os.tmpdir(), "zgrantshub-repo-stats.json");

async function load(): Promise<Record<string, RepoStats>> {
  if (cache) return cache;
  try {
    cache = JSON.parse(await fs.readFile(cachePath(), "utf8")) as Record<string, RepoStats>;
  } catch {
    cache = {};
  }
  return cache;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    const file = cachePath();
    const tmp = `${file}.${process.pid}.tmp`;
    try {
      await fs.writeFile(tmp, JSON.stringify(cache ?? {}));
      await fs.rename(tmp, file);
    } catch (e) {
      console.warn("[repoStats] could not persist cache:", e);
    }
  }, 1000);
}

interface GhRepo {
  full_name: string;
  archived: boolean;
  stargazers_count: number;
  pushed_at: string | null;
  open_issues_count: number;
}

async function fetchStats(repo: string): Promise<RepoStats> {
  const fetchedAt = new Date().toISOString();
  let info: GhRepo;
  try {
    info = await githubGet<GhRepo>(`/repos/${repo}`);
  } catch (e) {
    if (e instanceof Error && /\b404\b/.test(e.message)) {
      return {
        repo, exists: false, archived: false, stars: 0, pushedAt: null, openIssues: 0,
        latestRelease: null, nu7Release: null, activeContributors90d: 0, commits90d: 0, commitsCapped: false, fetchedAt,
      };
    }
    throw e;
  }
  const [releases, commits] = await Promise.all([
    githubGet<GhRelease[]>(`/repos/${repo}/releases?per_page=10`),
    githubGet<GhCommit[]>(`/repos/${repo}/commits?per_page=100&since=${sinceDaysAgo(90)}`).catch((e) => {
      // Empty repositories answer 409.
      if (e instanceof Error && /\b409\b/.test(e.message)) return [] as GhCommit[];
      throw e;
    }),
  ]);
  return {
    repo: info.full_name,
    exists: true,
    archived: info.archived,
    stars: info.stargazers_count,
    pushedAt: info.pushed_at,
    openIssues: info.open_issues_count,
    ...summarizeReleases(releases),
    ...summarizeCommits(commits),
    fetchedAt,
  };
}

function refreshOne(repo: string, key: string): Promise<RepoStats | null> {
  let p = inflight.get(key);
  if (!p) {
    p = fetchStats(repo)
      .then((s) => {
        cache![key] = s;
        scheduleSave();
        return s;
      })
      .catch((e) => {
        console.warn(`[repoStats] ${repo}:`, e instanceof Error ? e.message : e);
        return null;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  return p;
}

/**
 * Stats for each repo: fresh from cache, refreshed when older than a day, or
 * null when never fetched and GitHub is unavailable or rate-limited.
 */
export async function getRepoStats(repos: string[]): Promise<Record<string, RepoStats | null>> {
  const c = await load();
  const out: Record<string, RepoStats | null> = {};
  const todo: string[] = [];
  for (const repo of repos) {
    const hit = c[repo.toLowerCase()];
    out[repo] = hit ?? null;
    if (!hit || Date.now() - Date.parse(hit.fetchedAt) > TTL_MS) todo.push(repo);
  }
  let rateLimited = false;
  for (let i = 0; i < todo.length && !rateLimited; i += CONCURRENCY) {
    const batch = todo.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map((r) => refreshOne(r, r.toLowerCase())));
    results.forEach((s, j) => {
      if (s) out[batch[j]] = s;
      else rateLimited = true; // keep cached/null values for the rest
    });
  }
  return out;
}

/** Test hook. */
export function __resetRepoStatsForTests(): void {
  cache = null;
  inflight.clear();
}
