/**
 * Cached list of open bounties and beginner-friendly issues. Refreshed every 30
 * minutes; each source fails independently and keeps its last good result.
 */
import { buildGitHubServerHeaders } from "@/lib/github";
import {
  fromGithub,
  fromZechub,
  githubSearchQuery,
  ZECHUB_BOUNTIES_API,
  type GithubIssueRow,
  type Opportunity,
  type OpportunitySource,
  type ZechubBountyRow,
} from "@/lib/opportunities";

const TTL_MS = 30 * 60 * 1000;
/** The board lists newest first; open bounties are recent, so a few pages suffice. */
const ZECHUB_PAGES = 4;

type SourceState = { items: Opportunity[]; fetchedAt: number; error: string | null };
const state: Record<OpportunitySource, SourceState | null> = { zechub: null, github: null };
let inflight: Promise<void> | null = null;

async function json<T>(url: string, headers: HeadersInit = { Accept: "application/json" }): Promise<T> {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`${new URL(url).host} returned ${res.status}`);
  return res.json() as Promise<T>;
}

async function loadZechub(): Promise<Opportunity[]> {
  const rows: ZechubBountyRow[] = [];
  for (let page = 1; page <= ZECHUB_PAGES; page++) {
    const d = await json<{ data: ZechubBountyRow[]; total: number; limit: number }>(
      `${ZECHUB_BOUNTIES_API}?limit=50&page=${page}`
    );
    rows.push(...d.data);
    if (page * d.limit >= d.total) break;
  }
  return fromZechub(rows);
}

async function loadGithub(): Promise<Opportunity[]> {
  const q = encodeURIComponent(githubSearchQuery());
  const d = await json<{ items: GithubIssueRow[] }>(
    `https://api.github.com/search/issues?q=${q}&sort=created&order=desc&per_page=100`,
    buildGitHubServerHeaders()
  );
  return fromGithub(d.items);
}

async function refreshSource(src: OpportunitySource, load: () => Promise<Opportunity[]>) {
  try {
    state[src] = { items: await load(), fetchedAt: Date.now(), error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    state[src] = state[src]
      ? { ...state[src]!, error: msg }
      : { items: [], fetchedAt: Date.now(), error: msg };
  }
}

export interface OpportunitiesSnapshot {
  items: Opportunity[];
  errors: Partial<Record<OpportunitySource, string>>;
}

export async function getOpportunities(): Promise<OpportunitiesSnapshot> {
  const stale = (["zechub", "github"] as const).some(
    (s) => !state[s] || Date.now() - state[s]!.fetchedAt > TTL_MS
  );
  if (stale && !inflight) {
    inflight = Promise.all([refreshSource("zechub", loadZechub), refreshSource("github", loadGithub)])
      .then(() => undefined)
      .finally(() => {
        inflight = null;
      });
  }
  if (inflight && (!state.zechub || !state.github)) await inflight;

  const errors: OpportunitiesSnapshot["errors"] = {};
  for (const s of ["zechub", "github"] as const) if (state[s]?.error) errors[s] = state[s]!.error!;
  const items = [...(state.zechub?.items ?? []), ...(state.github?.items ?? [])].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
  return { items, errors };
}
