import { getGitHubToken } from "@/lib/githubAuth";

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
}

export interface GitHubComment {
  id: number;
  user: GitHubUser;
  body: string;
  created_at: string;
}

const OFFICIAL_REPO = "ZcashCommunityGrants/zcashcommunitygrants";
const REPO =
  process.env.NEXT_PUBLIC_GITHUB_REPO ||
  process.env.VITE_GITHUB_REPO ||
  OFFICIAL_REPO;
const API = "https://api.github.com";

function buildHeaders(): HeadersInit {
  const token =
    getGitHubToken() ??
    process.env.NEXT_PUBLIC_GITHUB_TOKEN ??
    process.env.VITE_GITHUB_TOKEN;
  return {
    Accept: "application/vnd.github.v3+json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function getPages<T>(
  path: string,
  params: Record<string, string> = {}
): Promise<T[]> {
  const all: T[] = [];
  let page = 1;

  while (true) {
    const qs = new URLSearchParams({
      ...params,
      page: String(page),
      per_page: "100",
    });
    const res = await fetch(`${API}${path}?${qs}`, { headers: buildHeaders() });

    if (!res.ok) {
      if (res.status === 403) {
        throw new Error(
          "GitHub API rate limit exceeded. Set VITE_GITHUB_TOKEN in your .env to increase the limit."
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

export async function fetchAllGrantIssues(): Promise<GitHubIssue[]> {
  const loadGrantIssues = async (repo: string): Promise<GitHubIssue[]> => {
    const [open, closed] = await Promise.all([
      getPages<GitHubIssue>(`/repos/${repo}/issues`, { state: "open" }),
      getPages<GitHubIssue>(`/repos/${repo}/issues`, { state: "closed" }),
    ]);
    return [...open, ...closed].filter((issue) =>
      issue.labels.some((l) => l.name.includes("Grant Application"))
    );
  };

  const primaryIssues = await loadGrantIssues(REPO);
  if (primaryIssues.length > 0 || REPO === OFFICIAL_REPO) {
    return primaryIssues;
  }

  return loadGrantIssues(OFFICIAL_REPO);
}

export async function fetchGrantIssue(number: number): Promise<GitHubIssue> {
  const res = await fetch(`${API}/repos/${REPO}/issues/${number}`, {
    headers: buildHeaders(),
  });
  if (res.ok) {
    return res.json();
  }
  if (REPO !== OFFICIAL_REPO && res.status === 404) {
    const fallback = await fetch(`${API}/repos/${OFFICIAL_REPO}/issues/${number}`, {
      headers: buildHeaders(),
    });
    if (!fallback.ok) {
      throw new Error(`GitHub API error ${fallback.status}: ${fallback.statusText}`);
    }
    return fallback.json();
  }
  throw new Error(`GitHub API error ${res.status}: ${res.statusText}`);
}

export async function fetchIssueComments(
  number: number
): Promise<GitHubComment[]> {
  try {
    return await getPages<GitHubComment>(`/repos/${REPO}/issues/${number}/comments`);
  } catch (error) {
    if (REPO !== OFFICIAL_REPO) {
      return getPages<GitHubComment>(
        `/repos/${OFFICIAL_REPO}/issues/${number}/comments`
      );
    }
    throw error;
  }
}
