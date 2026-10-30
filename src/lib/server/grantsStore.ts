/**
 * Server-side cache of parsed grants. All GitHub reads go through here so the
 * token stays on the server and every visitor shares one upstream fetch.
 *
 * - Fresh for SNAPSHOT_TTL_MS; after that the stale copy is served while a
 *   background refresh runs (stale-while-revalidate).
 * - If GitHub fails, the last good snapshot keeps being served.
 */
import type { Grant } from "@/data/grantTypes";
import {
  fetchAllGrantIssuesWithMeta,
  fetchGrantIssue,
  fetchIssueComments,
} from "@/lib/github";
import { parseIssueToGrant } from "@/lib/parseIssue";
import { getGrantRepoConfigs, parseGrantRouteId } from "@/lib/grantPrograms";

export const SNAPSHOT_TTL_MS = 5 * 60 * 1000;
const DETAIL_TTL_MS = 5 * 60 * 1000;
const DETAIL_CACHE_MAX = 200;

export interface GrantsSnapshot {
  grants: Grant[];
  fetchedAt: string;
  /** True when served past its TTL (refresh pending or upstream failing). */
  stale: boolean;
}

let snapshot: { grants: Grant[]; fetchedAt: number } | null = null;
let inflight: Promise<{ grants: Grant[]; fetchedAt: number }> | null = null;

async function buildSnapshot(): Promise<{ grants: Grant[]; fetchedAt: number }> {
  const metas = await fetchAllGrantIssuesWithMeta();
  const grants = metas.map(({ issue, program, sourceRepo }) =>
    parseIssueToGrant(issue, [], { program, sourceRepo })
  );
  return { grants, fetchedAt: Date.now() };
}

function refresh(): Promise<{ grants: Grant[]; fetchedAt: number }> {
  if (!inflight) {
    inflight = buildSnapshot()
      .then((s) => {
        snapshot = s;
        return s;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export async function getGrantsSnapshot(): Promise<GrantsSnapshot> {
  if (snapshot) {
    const age = Date.now() - snapshot.fetchedAt;
    if (age < SNAPSHOT_TTL_MS) {
      return { ...toPublic(snapshot), stale: false };
    }
    refresh().catch((e) => {
      console.warn("[grantsStore] background refresh failed:", e);
    });
    return { ...toPublic(snapshot), stale: true };
  }
  const s = await refresh();
  return { ...toPublic(s), stale: false };
}

function toPublic(s: { grants: Grant[]; fetchedAt: number }) {
  return { grants: s.grants, fetchedAt: new Date(s.fetchedAt).toISOString() };
}

const detailCache = new Map<string, { grant: Grant; fetchedAt: number }>();

/** Single grant with comments, keyed by route id (`zcg-42`, legacy `42`). */
export async function getGrantDetail(id: string): Promise<Grant> {
  const { program, issueNumber } = parseGrantRouteId(id);
  const key = `${program}-${issueNumber}`;
  const hit = detailCache.get(key);
  if (hit && Date.now() - hit.fetchedAt < DETAIL_TTL_MS) return hit.grant;

  try {
    const [issue, comments] = await Promise.all([
      fetchGrantIssue(issueNumber, program),
      fetchIssueComments(issueNumber, program),
    ]);
    const fromApi = issue.repository_url?.replace(
      "https://api.github.com/repos/",
      ""
    );
    const sourceRepo =
      fromApi ??
      getGrantRepoConfigs().find((c) => c.program === program)?.slug ??
      "";
    const grant = parseIssueToGrant(issue, comments, { program, sourceRepo });

    detailCache.delete(key);
    detailCache.set(key, { grant, fetchedAt: Date.now() });
    if (detailCache.size > DETAIL_CACHE_MAX) {
      const oldest = detailCache.keys().next().value;
      if (oldest !== undefined) detailCache.delete(oldest);
    }
    return grant;
  } catch (e) {
    if (hit) return hit.grant;
    throw e;
  }
}

/** Test hook. */
export function __resetGrantsStoreForTests(): void {
  snapshot = null;
  inflight = null;
  detailCache.clear();
}
