import { useQuery } from "@tanstack/react-query";
import {
  fetchAllGrantIssues,
  fetchGrantIssue,
  fetchIssueComments,
} from "@/lib/github";
import { parseIssueToGrant } from "@/lib/parseIssue";
import type { Grant } from "@/data/mockData";

/** Fetch and parse all grant applications from GitHub Issues. */
export function useGrants() {
  return useQuery<Grant[], Error>({
    queryKey: ["grants"],
    queryFn: async () => {
      const issues = await fetchAllGrantIssues();
      return issues.map((issue) => parseIssueToGrant(issue));
    },
    staleTime: 5 * 60 * 1000, // cache 5 minutes
    retry: 1,
  });
}

/** Fetch and parse a single grant by GitHub issue number, including comments. */
export function useGrant(id: string | undefined) {
  return useQuery<Grant, Error>({
    queryKey: ["grant", id],
    queryFn: async () => {
      if (!id) throw new Error("Grant ID is required");
      const issueNumber = parseInt(id, 10);
      if (isNaN(issueNumber)) throw new Error(`Invalid grant ID: ${id}`);

      const [issue, comments] = await Promise.all([
        fetchGrantIssue(issueNumber),
        fetchIssueComments(issueNumber),
      ]);

      return parseIssueToGrant(issue, comments);
    },
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
