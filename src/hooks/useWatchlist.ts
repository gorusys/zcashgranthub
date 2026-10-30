import { useCallback, useEffect, useMemo, useState } from "react";
import type { Grant } from "@/data/grantTypes";
import { useGrants } from "@/hooks/useGrants";
import { readGitHubSession, subscribeToGitHubAuth } from "@/lib/githubAuth";
import {
  computeUpdates,
  entryFor,
  markAllSeen,
  readWatchlist,
  subscribeWatchlist,
  writeWatchlist,
  type Watchlist,
} from "@/lib/watchlist";

/** Grants this browser follows. Empty until mounted (localStorage is client-only). */
export function useWatchlist() {
  const [watch, setWatch] = useState<Watchlist>({});
  useEffect(() => {
    const sync = () => setWatch(readWatchlist());
    sync();
    return subscribeWatchlist(sync);
  }, []);

  const toggle = useCallback((g: Pick<Grant, "id" | "title" | "status" | "lastUpdated">) => {
    const w = readWatchlist();
    if (w[g.id]) delete w[g.id];
    else w[g.id] = entryFor(g);
    writeWatchlist(w);
  }, []);

  return { watch, isWatched: (id: string) => Boolean(watch[id]), toggle };
}

function useGitHubLogin(): string | null {
  const [login, setLogin] = useState<string | null>(null);
  useEffect(() => {
    const sync = () => setLogin(readGitHubSession()?.user.login ?? null);
    sync();
    return subscribeToGitHubAuth(sync);
  }, []);
  return login;
}

/** Changes on watched grants (and the signed-in user's own) since last marked seen. */
export function useGrantUpdates() {
  const { watch } = useWatchlist();
  const login = useGitHubLogin();
  const active = Object.keys(watch).length > 0 || Boolean(login);
  const { data: grants = [] } = useGrants({ enabled: active });

  const updates = useMemo(() => computeUpdates(watch, grants, login), [watch, grants, login]);
  const markSeen = useCallback(() => writeWatchlist(markAllSeen(readWatchlist(), grants, login)), [grants, login]);

  return { updates, markSeen, watchedCount: Object.keys(watch).length, active };
}
