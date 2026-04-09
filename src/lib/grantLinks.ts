import type { GrantProgram } from "./grantPrograms";
import grantLinksFile from "@/data/grant-links.json";

export type GrantLinkConfidence = "high" | "medium" | "low";

export interface GrantLinkRow {
  zcgIssue?: number | null;
  coinholderIssue?: number | null;
  zechubProposalId?: number | null;
  note?: string;
}

export interface GrantLinksFile {
  links: GrantLinkRow[];
}

export interface ResolvedManualLink {
  kind: "zcg" | "coinholder" | "zechub";
  grantKey?: string;
  proposalId?: number;
  confidence: GrantLinkConfidence;
  reason: "manual_map";
  label: string;
  href: string;
}

function getLinks(): GrantLinkRow[] {
  const raw = grantLinksFile as GrantLinksFile;
  return Array.isArray(raw.links) ? raw.links : [];
}

/**
 * Manual links for the current GitHub grant (by program + issue number).
 */
export function manualLinksForGithubGrant(
  program: GrantProgram,
  issueNumber: number
): ResolvedManualLink[] {
  const links = getLinks();
  const out: ResolvedManualLink[] = [];

  for (const row of links) {
    const matchesZcg =
      program === "zcg" && row.zcgIssue != null && row.zcgIssue === issueNumber;
    const matchesCh =
      program === "coinholder" &&
      row.coinholderIssue != null &&
      row.coinholderIssue === issueNumber;
    if (!matchesZcg && !matchesCh) continue;

    if (
      row.zcgIssue != null &&
      !(program === "zcg" && row.zcgIssue === issueNumber)
    ) {
      out.push({
        kind: "zcg",
        grantKey: `zcg-${row.zcgIssue}`,
        confidence: "high",
        reason: "manual_map",
        label: `ZCG grant #${row.zcgIssue}`,
        href: `/grants/zcg-${row.zcgIssue}`,
      });
    }
    if (
      row.coinholderIssue != null &&
      !(program === "coinholder" && row.coinholderIssue === issueNumber)
    ) {
      out.push({
        kind: "coinholder",
        grantKey: `coinholder-${row.coinholderIssue}`,
        confidence: "high",
        reason: "manual_map",
        label: `Coinholder grant #${row.coinholderIssue}`,
        href: `/grants/coinholder-${row.coinholderIssue}`,
      });
    }
    if (row.zechubProposalId != null) {
      out.push({
        kind: "zechub",
        proposalId: row.zechubProposalId,
        confidence: "high",
        reason: "manual_map",
        label: `ZecHub DAO proposal A${row.zechubProposalId}`,
        href: `/zechub/proposals/${row.zechubProposalId}`,
      });
    }
  }

  return dedupeManual(out);
}

function dedupeManual(items: ResolvedManualLink[]): ResolvedManualLink[] {
  const seen = new Set<string>();
  return items.filter((x) => {
    const k = x.kind === "zechub" ? `z-${x.proposalId}` : `g-${x.grantKey}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Manual links pointing from a ZecHub proposal id to GitHub grants. */
export function manualLinksForZechubProposal(
  proposalId: number
): ResolvedManualLink[] {
  const links = getLinks();
  const out: ResolvedManualLink[] = [];

  for (const row of links) {
    if (row.zechubProposalId == null || row.zechubProposalId !== proposalId) {
      continue;
    }
    if (row.zcgIssue != null) {
      out.push({
        kind: "zcg",
        grantKey: `zcg-${row.zcgIssue}`,
        confidence: "high",
        reason: "manual_map",
        label: `ZCG grant #${row.zcgIssue}`,
        href: `/grants/zcg-${row.zcgIssue}`,
      });
    }
    if (row.coinholderIssue != null) {
      out.push({
        kind: "coinholder",
        grantKey: `coinholder-${row.coinholderIssue}`,
        confidence: "high",
        reason: "manual_map",
        label: `Coinholder grant #${row.coinholderIssue}`,
        href: `/grants/coinholder-${row.coinholderIssue}`,
      });
    }
  }

  return dedupeManual(out);
}
