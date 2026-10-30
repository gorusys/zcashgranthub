/**
 * Paid bounties and beginner-friendly issues across the Zcash ecosystem, in one shape.
 * Sources: ZecHub's ZEC Bounties board (public API) and GitHub issues labelled
 * "good first issue" / "help wanted" / "bounty" in core Zcash orgs.
 */

export type OpportunitySource = "zechub" | "github";

export interface Opportunity {
  id: string;
  source: OpportunitySource;
  title: string;
  url: string;
  /** Repo ("org/name") for GitHub issues, category for ZecHub bounties. */
  context: string;
  labels: string[];
  amountZec: number | null;
  difficulty: string | null;
  createdAt: string;
  dueAt: string | null;
  summary: string;
}

export const ZECHUB_BOUNTIES_API = "https://zechub.zone/api/bounties";
export const ZECHUB_BOUNTIES_SITE = "https://bounties.zechub.wiki";
export const GITHUB_ORGS = ["zcash", "ZcashFoundation", "zingolabs", "zodl-inc", "ZecHub"];
export const GITHUB_LABELS = ["good first issue", "help wanted", "bounty"];

export function githubSearchQuery(): string {
  const orgs = GITHUB_ORGS.map((o) => `org:${o}`).join(" ");
  const labels = `label:${GITHUB_LABELS.map((l) => `"${l}"`).join(",")}`;
  return `is:issue is:open ${labels} ${orgs}`;
}

const excerpt = (s: string | null | undefined, n = 220) => {
  const t = (s ?? "").replace(/[#*_`>[\]]/g, "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

export interface ZechubBountyRow {
  id: string;
  title: string;
  description?: string | null;
  bountyAmount?: number | null;
  dateCreated: string;
  timeToComplete?: string | null;
  status: string;
  isApproved?: boolean;
  isPrivate?: boolean;
  chain?: string;
  categoryId?: string | null;
  difficulty?: string | null;
}

/** Open, approved, public mainnet bounties nobody has taken yet. */
export function fromZechub(rows: ZechubBountyRow[]): Opportunity[] {
  return rows
    .filter(
      (b) =>
        b.status === "TO_DO" &&
        b.isApproved !== false &&
        !b.isPrivate &&
        (b.chain ?? "MAIN") === "MAIN"
    )
    .map((b) => ({
      id: `zechub-${b.id}`,
      source: "zechub",
      title: b.title.trim(),
      url: `${ZECHUB_BOUNTIES_SITE}/bounties/${b.id}`,
      context: b.categoryId ?? "ZecHub",
      labels: [],
      amountZec: typeof b.bountyAmount === "number" && b.bountyAmount > 0 ? b.bountyAmount : null,
      difficulty: b.difficulty ? b.difficulty.toLowerCase() : null,
      createdAt: b.dateCreated,
      dueAt: b.timeToComplete ?? null,
      summary: excerpt(b.description),
    }));
}

export interface GithubIssueRow {
  id: number;
  title: string;
  html_url: string;
  repository_url: string;
  labels: Array<{ name: string } | string>;
  created_at: string;
  body?: string | null;
  assignee?: unknown;
  pull_request?: unknown;
}

/** Open, unassigned issues (search can return PRs; drop them). */
export function fromGithub(rows: GithubIssueRow[]): Opportunity[] {
  return rows
    .filter((i) => !i.pull_request && !i.assignee)
    .map((i) => {
      const labels = i.labels.map((l) => (typeof l === "string" ? l : l.name));
      return {
        id: `github-${i.id}`,
        source: "github",
        title: i.title.trim(),
        url: i.html_url,
        context: i.repository_url.replace("https://api.github.com/repos/", ""),
        labels,
        amountZec: null,
        difficulty: labels.some((l) => /good first issue/i.test(l)) ? "easy" : null,
        createdAt: i.created_at,
        dueAt: null,
        summary: excerpt(i.body),
      };
    });
}
