import { useQuery } from "@tanstack/react-query";
import {
  fetchAllGrantIssuesWithMeta,
  fetchGrantIssue,
  fetchIssueComments,
} from "@/lib/github";
import { parseIssueToGrant } from "@/lib/parseIssue";
import type { Grant } from "@/data/mockData";
import {
  getGrantRepoConfigs,
  parseGrantRouteId,
} from "@/lib/grantPrograms";

/** Fetch and parse all grant applications from GitHub Issues. */
export function useGrants() {
  return useQuery<Grant[], Error>({
    queryKey: ["grants", "multi-repo"],
    queryFn: async () => {
      const metas = await fetchAllGrantIssuesWithMeta();
      return metas.map(({ issue, program, sourceRepo }) =>
        parseIssueToGrant(issue, [], { program, sourceRepo })
      );
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
      const { program, issueNumber } = parseGrantRouteId(id);

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

      return parseIssueToGrant(issue, comments, {
        program,
        sourceRepo,
      });
    },
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
