/**
 * GitHub REST reads for grant issues. Server-only: called from API routes via
 * src/lib/server/grantsStore.ts so the API token never reaches the browser.
 */
import {
  getGrantRepoConfigs,
  OFFICIAL_ZCG_REPO,
  type GrantProgram,
} from "@/lib/grantPrograms";
import { formatGrantId } from "@/lib/grantPrograms";

export interface GitHubLabel {
  id: number;
  name: string;
  color: string;
}

export interface GitHubUser {
  login: string;
  avatar_url: string;
  html_url: string;
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  labels: GitHubLabel[];
  user: GitHubUser;
  assignees: GitHubUser[];
  created_at: string;
  updated_at: string;
  html_url: string;
  /** Present on single-issue GET; used to recover `sourceRepo` for detail parsing */
  repository_url?: string;
}

export interface GitHubComment {
  id: number;
  user: GitHubUser;
  body: string;
  created_at: string;
}

const API = "https://api.github.com";

let warnedPublicToken = false;

/** Server token: `GITHUB_API_TOKEN` (or `GITHUB_TOKEN`). Never use a NEXT_PUBLIC_* var. */
export function buildGitHubServerHeaders(): HeadersInit {
  const token = process.env.GITHUB_API_TOKEN || process.env.GITHUB_TOKEN;
  if (!token && process.env.NEXT_PUBLIC_GITHUB_TOKEN && !warnedPublicToken) {
    warnedPublicToken = true;
    console.warn(
      "[github] NEXT_PUBLIC_GITHUB_TOKEN is ignored because NEXT_PUBLIC_* values are exposed to browsers. " +
        "Rename it to GITHUB_API_TOKEN and revoke the old token."
    );
  }
  return {
    Accept: "application/vnd.github.v3+json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function getPages<T>(
  path: string,
  params: Record<string, string> = {},
  headers: HeadersInit = buildGitHubServerHeaders()
): Promise<T[]> {
  const all: T[] = [];
  let page = 1;

  while (true) {
    const qs = new URLSearchParams({
      ...params,
      page: String(page),
      per_page: "100",
    });
    const res = await fetch(`${API}${path}?${qs}`, { headers });

    if (!res.ok) {
      if (res.status === 403) {
        throw new Error(
          "GitHub API rate limit exceeded. Set GITHUB_API_TOKEN on the server to increase the limit."
        );
      }
      throw new Error(`GitHub API error ${res.status}: ${res.statusText}`);
    }

    const data: T[] = await res.json();
    all.push(...data);
    if (data.length < 100) break;
    page++;
  }

  return all;
}

function issueLooksLikeGrantApplication(
  issue: GitHubIssue,
  program: GrantProgram
): boolean {
  if (issue.labels.some((l) => l.name.includes("Grant Application"))) {
    return true;
  }
  if (program === "coinholder") {
    const body = issue.body ?? "";
    if (body.includes("## Terms and Conditions")) return true;
    if (body.includes("### Terms and Conditions")) return true;
    if (body.includes("```milestones.yaml")) return true;
    if (/retroactive\s+grant\s+application/i.test(issue.title)) return true;
    if (/grant\s+application/i.test(issue.title)) return true;
    return false;
  }
  return false;
}

async function loadGrantIssuesForRepo(
  repo: string,
  program: GrantProgram
): Promise<GitHubIssue[]> {
  const [open, closed] = await Promise.all([
    getPages<GitHubIssue>(`/repos/${repo}/issues`, { state: "open" }),
    getPages<GitHubIssue>(`/repos/${repo}/issues`, { state: "closed" }),
  ]);
  const merged = [...open, ...closed];
  return merged.filter((issue) => issueLooksLikeGrantApplication(issue, program));
}

export async function fetchAllGrantIssues(): Promise<GitHubIssue[]> {
  const metas = await fetchAllGrantIssuesWithMeta();
  if (metas.length > 0) {
    return metas.map((m) => m.issue);
  }
  const zcgRepo =
    getGrantRepoConfigs().find((c) => c.program === "zcg")?.slug ??
    OFFICIAL_ZCG_REPO;
  return loadGrantIssuesForRepo(zcgRepo, "zcg");
}

/** All grant issues with program + repo metadata for aggregation. */
export async function fetchAllGrantIssuesWithMeta(): Promise<
  Array<{ issue: GitHubIssue; program: GrantProgram; sourceRepo: string }>
> {
  const configs = getGrantRepoConfigs();
  const buckets = await Promise.all(
    configs.map((c) => loadGrantIssuesForRepo(c.slug, c.program))
  );
  return configs.flatMap((c, i) =>
    buckets[i].map((issue) => ({
      issue,
      program: c.program,
      sourceRepo: c.slug,
    }))
  );
}

function repoForProgram(program: GrantProgram): string {
  const c = getGrantRepoConfigs().find((x) => x.program === program);
  if (c) return c.slug;
  return OFFICIAL_ZCG_REPO;
}

export async function fetchGrantIssue(
  issueNumber: number,
  program: GrantProgram = "zcg"
): Promise<GitHubIssue> {
  const repo = repoForProgram(program);
  const res = await fetch(`${API}/repos/${repo}/issues/${issueNumber}`, {
    headers: buildGitHubServerHeaders(),
  });
  if (res.ok) {
    return res.json();
  }
  if (program === "zcg" && repo !== OFFICIAL_ZCG_REPO && res.status === 404) {
    const fallback = await fetch(
      `${API}/repos/${OFFICIAL_ZCG_REPO}/issues/${issueNumber}`,
      { headers: buildGitHubServerHeaders() }
    );
    if (!fallback.ok) {
      throw new Error(
        `GitHub API error ${fallback.status}: ${fallback.statusText}`
      );
    }
    return fallback.json();
  }
  throw new Error(`GitHub API error ${res.status}: ${res.statusText}`);
}

export async function fetchIssueComments(
  issueNumber: number,
  program: GrantProgram = "zcg"
): Promise<GitHubComment[]> {
  const repo = repoForProgram(program);
  try {
    return await getPages<GitHubComment>(
      `/repos/${repo}/issues/${issueNumber}/comments`
    );
  } catch (error) {
    if (program === "zcg" && repo !== OFFICIAL_ZCG_REPO) {
      return getPages<GitHubComment>(
        `/repos/${OFFICIAL_ZCG_REPO}/issues/${issueNumber}/comments`
      );
    }
    throw error;
  }
}

/** Lightweight list for related-grant scoring (server), served from the shared snapshot. */
export async function fetchGrantIssueSummariesForProgram(
  program: GrantProgram
): Promise<Array<{ issueNumber: number; title: string; htmlUrl: string }>> {
  const { getGrantsSnapshot } = await import("@/lib/server/grantsStore");
  const { grants } = await getGrantsSnapshot();
  return grants
    .filter((g) => g.program === program)
    .map((g) => ({
      issueNumber: g.issueNumber,
      title: g.title,
      htmlUrl: g.githubLink,
    }));
}

export { formatGrantId };
