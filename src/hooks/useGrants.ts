import { useQuery } from "@tanstack/react-query";
import type { Grant } from "@/data/grantTypes";
import type { GrantsSnapshot } from "@/lib/server/grantsStore";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      body && typeof body.error === "string"
        ? body.error
        : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return body as T;
}

/** All grant applications (ZCG + Coinholder) as list views, from the server-side snapshot. */
export function useGrants({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<Grant[], Error>({
    queryKey: ["grants", "multi-repo"],
    queryFn: async () =>
      (await getJson<GrantsSnapshot>("/api/grants")).grants,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled,
  });
}

/** Single grant by route id (`zcg-42`, `coinholder-7`, legacy `42`), including comments. */
export function useGrant(id: string | undefined) {
  return useQuery<Grant, Error>({
    queryKey: ["grant", id],
    queryFn: async () => {
      if (!id) throw new Error("Grant ID is required");
      const { grant } = await getJson<{ grant: Grant }>(
        `/api/grants/${encodeURIComponent(id)}`
      );
      return grant;
    },
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
