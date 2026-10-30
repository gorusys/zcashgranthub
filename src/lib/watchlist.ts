/**
 * Browser-only watchlist: grants a visitor follows, with the state they last saw.
 * Updates are computed by diffing against the current snapshot, so nothing about
 * who watches what ever leaves the browser.
 */
import type { Grant, GrantStatus } from "@/data/grantTypes";

const STORAGE_KEY = "zgh_watchlist_v1";
const CHANGE_EVENT = "zgh-watchlist-change";

export interface WatchEntry {
  title: string;
  status: GrantStatus;
  lastUpdated: string;
  watchedAt: string;
}

export type Watchlist = Record<string, WatchEntry>;

export interface GrantUpdate {
  grantId: string;
  title: string;
  kind: "status" | "activity" | "new";
  from?: GrantStatus;
  to?: GrantStatus;
  at: string;
}

export function readWatchlist(): Watchlist {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Watchlist) : {};
  } catch {
    return {};
  }
}

export function writeWatchlist(w: Watchlist): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(w));
  } catch {
    /* storage blocked: watching just won't persist */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeWatchlist(cb: () => void): () => void {
  const onStorage = (e: StorageEvent) => e.key === STORAGE_KEY && cb();
  window.addEventListener(CHANGE_EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function entryFor(g: Pick<Grant, "title" | "status" | "lastUpdated">, now = new Date()): WatchEntry {
  return { title: g.title, status: g.status, lastUpdated: g.lastUpdated, watchedAt: now.toISOString() };
}

/**
 * What changed on watched grants since they were last marked seen. Grants
 * authored by `login` are watched implicitly; one the visitor has never seen
 * is reported as "new" so their own fresh application shows up.
 */
export function computeUpdates(watch: Watchlist, grants: Grant[], login?: string | null): GrantUpdate[] {
  const mine = (g: Grant) => !!login && g.githubUsername.toLowerCase() === login.toLowerCase();
  const out: GrantUpdate[] = [];
  for (const g of grants) {
    const seen = watch[g.id];
    if (!seen) {
      if (mine(g)) out.push({ grantId: g.id, title: g.title, kind: "new", to: g.status, at: g.lastUpdated });
      continue;
    }
    if (seen.status !== g.status) {
      out.push({ grantId: g.id, title: g.title, kind: "status", from: seen.status, to: g.status, at: g.lastUpdated });
    } else if (g.lastUpdated > seen.lastUpdated) {
      out.push({ grantId: g.id, title: g.title, kind: "activity", at: g.lastUpdated });
    }
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

/** Record the current state of every watched (and own) grant as seen. */
export function markAllSeen(watch: Watchlist, grants: Grant[], login?: string | null): Watchlist {
  const next: Watchlist = { ...watch };
  for (const g of grants) {
    const own = !!login && g.githubUsername.toLowerCase() === login.toLowerCase();
    if (next[g.id] || own) {
      next[g.id] = { ...entryFor(g), watchedAt: next[g.id]?.watchedAt ?? new Date().toISOString() };
    }
  }
  return next;
}
