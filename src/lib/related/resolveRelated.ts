import { grantTitleMatchScore } from "@/lib/daodao/grantTitleMatch";
import {
  findZechubProposalIdByGithubIssue,
  listZechubProposalsByTitleSimilarity,
} from "@/lib/daodao/zechubIndexer";
import { fetchGrantIssueSummariesForProgram } from "@/lib/github";
import {
  manualLinksForGithubGrant,
  manualLinksForZechubProposal,
} from "@/lib/grantLinks";
import type { GrantProgram } from "@/lib/grantPrograms";

export type RelatedConfidence = "high" | "medium" | "low";

export interface RelatedItem {
  kind: "zcg" | "coinholder" | "zechub";
  confidence: RelatedConfidence;
  reason: string;
  label: string;
  href: string;
  subtitle?: string;
}

function confidenceFromScore(score: number): RelatedConfidence {
  if (score >= 0.88) return "high";
  if (score >= 0.72) return "medium";
  return "low";
}

function dedupeByHref(items: RelatedItem[]): RelatedItem[] {
  const seen = new Set<string>();
  return items.filter((x) => {
    if (seen.has(x.href)) return false;
    seen.add(x.href);
    return true;
  });
}

/** Related records for a GitHub grant (ZCG or Coinholder). */
export async function resolveRelatedForGithubGrant(params: {
  program: GrantProgram;
  issueNumber: number;
  title: string;
}): Promise<RelatedItem[]> {
  const { program, issueNumber, title } = params;
  const out: RelatedItem[] = [];

  for (const m of manualLinksForGithubGrant(program, issueNumber)) {
    out.push({
      kind: m.kind,
      confidence: m.confidence,
      reason: m.reason,
      label: m.label,
      href: m.href,
    });
  }

  try {
    const byIssueBody = await findZechubProposalIdByGithubIssue(issueNumber);
    if (byIssueBody != null) {
      out.push({
        kind: "zechub",
        confidence: "high",
        reason: "github_issue_cited_in_proposal_text",
        label: `ZecHub DAO proposal A${byIssueBody}`,
        href: `/zechub/proposals/${byIssueBody}`,
      });
    }
  } catch {
    /* indexer optional */
  }

  const other: GrantProgram = program === "zcg" ? "coinholder" : "zcg";
  try {
    const summaries = await fetchGrantIssueSummariesForProgram(other);
    for (const s of summaries) {
      const score = grantTitleMatchScore(title, s.title);
      if (score < 0.62) continue;
      const key = `${other}-${s.issueNumber}`;
      out.push({
        kind: other,
        confidence: confidenceFromScore(score),
        reason: "title_similarity",
        label: `${other === "zcg" ? "ZCG" : "Coinholder"} #${s.issueNumber}`,
        subtitle: s.title.length > 140 ? `${s.title.slice(0, 137)}…` : s.title,
        href: `/grants/${key}`,
      });
    }
  } catch {
    /* GitHub optional */
  }

  try {
    const zechubList = await listZechubProposalsByTitleSimilarity(title, 6, 0.55);
    for (const z of zechubList) {
      out.push({
        kind: "zechub",
        confidence: confidenceFromScore(z.score),
        reason: "title_similarity",
        label: `ZecHub A${z.id}`,
        subtitle: z.title.length > 140 ? `${z.title.slice(0, 137)}…` : z.title,
        href: `/zechub/proposals/${z.id}`,
      });
    }
  } catch {
    /* indexer optional */
  }

  return dedupeByHref(out);
}

/** Related GitHub grants for a ZecHub DAO proposal. */
export async function resolveRelatedForZechubProposal(params: {
  proposalId: number;
  title: string;
}): Promise<RelatedItem[]> {
  const { proposalId, title } = params;
  const out: RelatedItem[] = [];

  for (const m of manualLinksForZechubProposal(proposalId)) {
    out.push({
      kind: m.kind,
      confidence: m.confidence,
      reason: m.reason,
      label: m.label,
      href: m.href,
    });
  }

  const mergeSummaries: Array<{
    program: GrantProgram;
    issueNumber: number;
    title: string;
  }> = [];

  try {
    const zcg = await fetchGrantIssueSummariesForProgram("zcg");
    mergeSummaries.push(
      ...zcg.map((s) => ({
        program: "zcg" as const,
        issueNumber: s.issueNumber,
        title: s.title,
      }))
    );
  } catch {
    /* ignore */
  }

  try {
    const ch = await fetchGrantIssueSummariesForProgram("coinholder");
    mergeSummaries.push(
      ...ch.map((s) => ({
        program: "coinholder" as const,
        issueNumber: s.issueNumber,
        title: s.title,
      }))
    );
  } catch {
    /* ignore */
  }

  for (const s of mergeSummaries) {
    const score = grantTitleMatchScore(title, s.title);
    if (score < 0.62) continue;
    const key = `${s.program}-${s.issueNumber}`;
    out.push({
      kind: s.program,
      confidence: confidenceFromScore(score),
      reason: "title_similarity",
      label: `${s.program === "zcg" ? "ZCG" : "Coinholder"} #${s.issueNumber}`,
      subtitle: s.title.length > 140 ? `${s.title.slice(0, 137)}…` : s.title,
      href: `/grants/${key}`,
    });
  }

  return dedupeByHref(out);
}
