/**
 * Server-side archive of ZCG committee decisions parsed from @ZCG meeting minutes
 * on the Zcash Community Forum.
 *
 * Minutes are effectively immutable once posted, so each minutes topic is fetched
 * once and cached (recent ones are re-read for a couple of weeks to pick up
 * edits). The topic list is refreshed hourly. The cache is persisted to disk
 * (MINUTES_CACHE_PATH, default in the OS temp dir).
 */
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  meetingDateFromTitle,
  parseMinutesHtml,
  type ZcgDecision,
} from "@/lib/zcgMinutes";

const FORUM = "https://forum.zcashcommunity.com";
const LIST_TTL_MS = 60 * 60 * 1000;
const RECHECK_RECENT_MS = 14 * 86_400_000;
const MAX_SEARCH_PAGES = 6;
const CONCURRENCY = 3;
/** Pause between search pages; anonymous Discourse search is rate-limited. */
const SEARCH_PAGE_DELAY_MS = 1500;
const RETRY_AFTER_FAILURE_MS = 5 * 60 * 1000;

interface CachedMinutes {
  topicId: number;
  title: string;
  postedAt: string;
  fetchedAt: number;
  decisions: ZcgDecision[];
}

interface Cache {
  listedAt: number;
  minutes: Record<number, CachedMinutes>;
}

let cache: Cache | null = null;
let inflight: Promise<void> | null = null;
let lastFailureAt = 0;
let lastError: unknown = null;

function cachePath(): string {
  return process.env.MINUTES_CACHE_PATH || path.join(os.tmpdir(), "zgrantshub-zcg-minutes.json");
}

async function loadDisk(): Promise<Cache> {
  try {
    const raw = JSON.parse(await fs.readFile(cachePath(), "utf8")) as Cache;
    if (raw && typeof raw.listedAt === "number" && raw.minutes) return raw;
  } catch {
    /* start empty */
  }
  return { listedAt: 0, minutes: {} };
}

async function saveDisk(c: Cache): Promise<void> {
  const file = cachePath();
  const tmp = `${file}.${process.pid}.tmp`;
  try {
    await fs.writeFile(tmp, JSON.stringify(c));
    await fs.rename(tmp, file);
  } catch (e) {
    console.warn("[minutesStore] could not persist cache:", e);
  }
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Forum request failed (${res.status}) for ${url}`);
  return res.json() as Promise<T>;
}

interface SearchTopic {
  id: number;
  title: string;
  created_at: string;
}

/** Minutes topics, newest first. Later pages are best-effort: keep what we got if one fails. */
async function listMinutesTopics(): Promise<SearchTopic[]> {
  const q = encodeURIComponent('"Meeting Minutes" in:title @ZCG order:latest');
  const out: SearchTopic[] = [];
  for (let page = 1; page <= MAX_SEARCH_PAGES; page++) {
    if (page > 1) await new Promise((r) => setTimeout(r, SEARCH_PAGE_DELAY_MS));
    let data: { topics?: SearchTopic[] };
    try {
      data = await getJson<{ topics?: SearchTopic[] }>(`${FORUM}/search.json?q=${q}&page=${page}`);
    } catch (e) {
      if (page === 1) throw e;
      console.warn("[minutesStore] stopped listing at page", page, e);
      break;
    }
    out.push(...(data.topics ?? []).filter((t) => /meeting minutes/i.test(t.title)));
    if ((data.topics ?? []).length === 0) break;
  }
  return out;
}

async function fetchMinutes(t: SearchTopic): Promise<CachedMinutes> {
  const data = await getJson<{ post_stream: { posts: Array<{ cooked: string; username: string }> } }>(
    `${FORUM}/t/${t.id}.json`
  );
  const first = data.post_stream.posts[0];
  const decisions =
    first && first.username.toLowerCase() === "zcg"
      ? parseMinutesHtml(first.cooked, {
          minutesTopicId: t.id,
          minutesUrl: `${FORUM}/t/${t.id}`,
          meetingDate: meetingDateFromTitle(t.title, t.created_at),
        })
      : [];
  return { topicId: t.id, title: t.title, postedAt: t.created_at, fetchedAt: Date.now(), decisions };
}

async function refresh(): Promise<void> {
  const c = cache ?? (await loadDisk());
  const topics = await listMinutesTopics();
  const now = Date.now();
  const todo = topics.filter((t) => {
    const hit = c.minutes[t.id];
    return !hit || (now - Date.parse(t.created_at) < RECHECK_RECENT_MS && now - hit.fetchedAt > LIST_TTL_MS);
  });

  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    const batch = await Promise.allSettled(todo.slice(i, i + CONCURRENCY).map(fetchMinutes));
    for (const r of batch) {
      if (r.status === "fulfilled") c.minutes[r.value.topicId] = r.value;
      else console.warn("[minutesStore]", r.reason);
    }
  }
  c.listedAt = now;
  cache = c;
  await saveDisk(c);
}

async function ensureFresh(): Promise<Cache> {
  if (!cache) cache = await loadDisk();
  const now = Date.now();
  const stale = now - cache.listedAt > LIST_TTL_MS;
  const backingOff = now - lastFailureAt < RETRY_AFTER_FAILURE_MS;
  if (stale && !inflight && !backingOff) {
    inflight = refresh()
      .then(() => {
        lastError = null;
      })
      .catch((e) => {
        lastFailureAt = Date.now();
        lastError = e;
        console.warn("[minutesStore] refresh failed:", e);
      })
      .finally(() => {
        inflight = null;
      });
  }
  // First run with nothing cached: wait for the initial build.
  if (Object.keys(cache.minutes).length === 0) {
    if (inflight) await inflight;
    if (Object.keys(cache.minutes).length === 0 && lastError) throw lastError;
  }
  return cache;
}

export interface DecisionsSnapshot {
  decisions: ZcgDecision[];
  meetings: number;
  listedAt: string | null;
}

/** All parsed decisions, newest meeting first. */
export async function getZcgDecisions(): Promise<DecisionsSnapshot> {
  const c = await ensureFresh();
  const all = Object.values(c.minutes);
  const decisions = all
    .flatMap((m) => m.decisions)
    .sort((a, b) => b.meetingDate.localeCompare(a.meetingDate) || a.title.localeCompare(b.title));
  return {
    decisions,
    meetings: all.length,
    listedAt: c.listedAt ? new Date(c.listedAt).toISOString() : null,
  };
}

/** Test hook. */
export function __resetMinutesStoreForTests(): void {
  cache = null;
  inflight = null;
  lastFailureAt = 0;
  lastError = null;
}
