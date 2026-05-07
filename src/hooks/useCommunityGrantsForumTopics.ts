import { useQuery } from "@tanstack/react-query";
import type { CommunityGrantsForumTopicsPayload } from "@/lib/communityGrantsForumTopics";

interface UseTopicsOptions {
  page?: number;
  limit?: number;
  search?: string;
}

async function fetchCommunityGrantsForumTopics(
  options: UseTopicsOptions
): Promise<CommunityGrantsForumTopicsPayload> {
  const params = new URLSearchParams();
  params.set("page", String(options.page ?? 1));
  params.set("limit", String(options.limit ?? 30));
  if (options.search && options.search.trim()) {
    params.set("search", options.search.trim());
  }

  const res = await fetch(`/api/forum/community-grants-topics?${params}`);
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<CommunityGrantsForumTopicsPayload>;
}

export function useCommunityGrantsForumTopics(options: UseTopicsOptions = {}) {
  const page = options.page ?? 1;
  const limit = options.limit ?? 30;
  const search = options.search?.trim() ?? "";

  return useQuery<CommunityGrantsForumTopicsPayload, Error>({
    queryKey: ["community-grants-forum-topics", page, limit, search],
    queryFn: () =>
      fetchCommunityGrantsForumTopics({
        page,
        limit,
        search,
      }),
    staleTime: 60 * 1000,
    retry: 1,
  });
}
