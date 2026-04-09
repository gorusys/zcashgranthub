import type { GitHubIssue, GitHubComment } from "./github";
import type {
  Grant,
  GrantStatus,
  GrantCategory,
  Milestone,
  TeamMember,
} from "@/data/mockData";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function esc(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Extract the text content of a ### Section from a GitHub issue body. */
function extractSection(body: string, heading: string): string {
  const re = new RegExp(
    `### ${esc(heading)}\\s*\\n+([\\s\\S]*?)(?=\\n### |$)`,
    "i"
  );
  const m = body.match(re);
  return m ? m[1].trim() : "";
}

/** Extract content of a fenced code block with the given language tag. */
function extractCodeBlock(body: string, lang: string): string {
  const re = new RegExp("```" + esc(lang) + "\\n([\\s\\S]*?)```", "i");
  const m = body.match(re);
  return m ? m[1].trim() : "";
}

/** Extract the value of a `Key: value` line (case-insensitive). */
function inlineValue(text: string, key: string): string {
  const re = new RegExp(`^\\s*${esc(key)}:\\s*(.+)$`, "im");
  const m = text.match(re);
  return m ? m[1].trim() : "";
}

/** Extract bullet list items under a YAML-style `Heading:` key. */
function listItems(text: string, heading: string): string[] {
  const re = new RegExp(
    `${esc(heading)}:\\s*\\n((?:[ \\t]*- [^\\n]+\\n?)+)`,
    "i"
  );
  const m = text.match(re);
  if (!m) return [];
  return m[1]
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- "))
    .map((l) => l.slice(2).replace(/^["']|["']$/g, "").trim())
    .filter(Boolean);
}

function parseAmount(str: string): number {
  if (!str) return 0;
  const n = parseFloat(str.replace(/[$,\s]/g, ""));
  return isNaN(n) ? 0 : n;
}

// ---------------------------------------------------------------------------
// Category
// ---------------------------------------------------------------------------

const VALID_CATEGORIES: GrantCategory[] = [
  "Infrastructure",
  "Community",
  "Education",
  "Non-Wallet Applications",
  "Integration",
  "Wallets",
  "Research & Development",
  "Media",
  "Zcash Protocol Extension",
  "Dedicated Resource",
  "Event Sponsorships",
];

function parseCategory(str: string): GrantCategory {
  const t = str.trim();
  if (VALID_CATEGORIES.includes(t as GrantCategory)) return t as GrantCategory;
  const found = VALID_CATEGORIES.find(
    (c) => c.toLowerCase() === t.toLowerCase()
  );
  return found ?? "Infrastructure";
}

// ---------------------------------------------------------------------------
// Status (from labels + issue state)
// ---------------------------------------------------------------------------

export function labelToStatus(
  labels: { name: string }[],
  state: "open" | "closed"
): GrantStatus {
  const names = labels.map((l) => l.name.toLowerCase());

  if (names.some((n) => n.includes("rejected"))) return "REJECTED";
  if (state === "closed") return "COMPLETED";
  if (names.some((n) => n.includes("startup payment"))) return "ACTIVE";
  if (names.some((n) => n.includes("grant approved"))) return "APPROVED";
  if (names.some((n) => n.includes("ready for zcg review")))
    return "COMMITTEE_REVIEW";
  if (names.some((n) => n.includes("community review")))
    return "COMMUNITY_REVIEW";
  return "PENDING_REVIEW";
}

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------

function parseTeamLead(body: string): TeamMember {
  const block =
    extractCodeBlock(body, "project-lead.yaml") ||
    extractSection(body, "Project Lead");
  return {
    name: inlineValue(block, "Name") || "Unknown",
    role: inlineValue(block, "Role"),
    background: inlineValue(block, "Background"),
    responsibilities: inlineValue(block, "Responsibilities"),
  };
}

function parseTeamMembers(body: string): TeamMember[] {
  const block =
    extractCodeBlock(body, "team-members.yaml") ||
    extractSection(body, "Additional Team Members");

  if (!block) return [];
  const lower = block.toLowerCase();
  if (lower.includes("none") || lower.includes("n/a")) return [];

  // Split on lines that start a new member entry: "- Name:"
  const parts = block
    .split(/(?=^-\s*Name:)/im)
    .filter((p) => /^-\s*Name:/i.test(p.trim()));

  return parts
    .map((part) => ({
      name: inlineValue(part, "Name"),
      role: inlineValue(part, "Role"),
      background: inlineValue(part, "Background"),
      responsibilities: inlineValue(part, "Responsibilities"),
    }))
    .filter((m) => Boolean(m.name));
}

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------

function parseMilestones(body: string): Milestone[] {
  const block = extractCodeBlock(body, "milestones.yaml");
  if (!block) return [];

  // Split on "- Milestone: N" entries
  const parts = block
    .split(/(?=^- Milestone:)/im)
    .filter((p) => /^- Milestone:/i.test(p.trim()));

  return parts
    .map((part): Milestone | null => {
      const number = parseInt(inlineValue(part, "Milestone"), 10);
      if (isNaN(number) || number <= 0) return null;

      const amountStr =
        inlineValue(part, "Amount (USD)") || inlineValue(part, "Amount");

      return {
        number,
        amount: parseAmount(amountStr),
        dueDate: inlineValue(part, "Expected Completion Date"),
        status: "Pending",
        userStories: listItems(part, "User Stories"),
        deliverables: listItems(part, "Deliverables"),
        acceptanceCriteria: inlineValue(part, "Acceptance Criteria"),
      };
    })
    .filter((m): m is Milestone => m !== null);
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

function parseDocuments(
  body: string
): { name: string; url: string; description: string }[] {
  const block =
    extractCodeBlock(body, "files.yaml") ||
    extractSection(body, "Supporting Documents");
  if (!block) return [];

  return block
    .split("\n")
    .filter((l) => l.trim().startsWith("-"))
    .map((l) => {
      const line = l.replace(/^-\s*/, "").trim();
      const urlMatch = line.match(/https?:\/\/[^\s)>]+/);
      const url = urlMatch ? urlMatch[0] : "#";
      const name = line
        .replace(url !== "#" ? url : "", "")
        .replace(/^[:\s]+|[:\s]+$/g, "")
        .trim();
      return { name: name || "Document", url, description: "" };
    })
    .filter((d) => d.name && d.name !== "-");
}

// ---------------------------------------------------------------------------
// Forum link
// ---------------------------------------------------------------------------

function forumLink(body: string, comments: GitHubComment[]): string {
  const text = [body, ...comments.map((c) => c.body)].join(" ");
  const m = text.match(/https?:\/\/forum\.zcashcommunity\.com\/[^\s)>]+/);
  return m ? m[0] : "https://forum.zcashcommunity.com/c/grants/33";
}

/**
 * Detect a ZecHub DAO DAO proposal reference (Juno, prefix A) in issue text.
 * Matches daodao.zone proposal URLs and common "Proposal A123" phrasing.
 */
export function extractZechubDaoProposalId(body: string): number | null {
  const fromUrl = body.match(
    /daodao\.zone\/dao\/juno1[a-z0-9]+\/proposals\/A(\d+)/i
  );
  if (fromUrl) return parseInt(fromUrl[1], 10);
  const prop = body.match(/(?:^|\s)proposal\s+A(\d+)\b/im);
  if (prop) return parseInt(prop[1], 10);
  const labeled = body.match(/DAO\s+Proposal\s*:?\s*A(\d+)/i);
  if (labeled) return parseInt(labeled[1], 10);
  return null;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function parseIssueToGrant(
  issue: GitHubIssue,
  comments: GitHubComment[] = []
): Grant {
  const body = issue.body ?? "";

  const milestones = parseMilestones(body);
  const paidMilestones = milestones.filter((m) => m.status === "Paid");

  const requestedAmount = parseAmount(
    extractSection(body, "Requested Grant Amount (USD)")
  );
  const totalBudget = parseAmount(extractSection(body, "Total Budget (USD)"));
  const amount = totalBudget || requestedAmount;

  // Strip the "Grant Application - " prefix from title
  const title = issue.title.replace(/^Grant\s+Application\s*[-–]\s*/i, "").trim();

  return {
    id: String(issue.number),
    title,
    applicant: issue.user.login,
    applicantAvatar: issue.user.avatar_url,
    githubUsername: issue.user.login,
    category: parseCategory(extractSection(body, "Category")),
    status: labelToStatus(issue.labels, issue.state),
    amount,
    submittedDate: issue.created_at,
    lastUpdated: issue.updated_at,
    summary: extractSection(body, "Project Summary"),
    description: extractSection(body, "Project Description"),
    problem: extractSection(body, "Proposed Problem"),
    solution: extractSection(body, "Proposed Solution"),
    solutionFormat: extractSection(body, "Solution Format"),
    dependencies: extractSection(body, "Dependencies"),
    technicalApproach: extractSection(body, "Technical Approach"),
    upstreamMerge: extractSection(body, "Upstream Merge Opportunities"),
    milestones,
    milestonesCompleted: paidMilestones.length,
    totalMilestones: milestones.length,
    amountPaid: paidMilestones.reduce((s, m) => s + m.amount, 0),
    teamLead: parseTeamLead(body),
    teamMembers: parseTeamMembers(body),
    budget: {
      hardware: parseAmount(extractSection(body, "Hardware/Software Costs (USD)")),
      services: parseAmount(extractSection(body, "Service Costs (USD)")),
      compensation: parseAmount(extractSection(body, "Compensation Costs (USD)")),
      total: amount,
    },
    risks: {
      implementation: extractSection(body, "Implementation Risks"),
      sideEffects: extractSection(body, "Potential Side Effects"),
      successMetrics: extractSection(body, "Success Metrics"),
    },
    comments: comments.map((c) => ({
      id: String(c.id),
      author: c.user.login,
      avatar: c.user.avatar_url,
      timestamp: c.created_at,
      body: c.body,
    })),
    documents: parseDocuments(body),
    committeeMembers: issue.assignees.map((a) => a.login),
    forumLink: forumLink(body, comments),
    githubLink: issue.html_url,
    zechubDaoProposalId: extractZechubDaoProposalId(body),
  };
}
