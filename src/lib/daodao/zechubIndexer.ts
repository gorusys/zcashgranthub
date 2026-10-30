import type { DaoProposalSingleRaw, ZechubDaoMeta } from "./types";
import { grantTitleMatchScore } from "./grantTitleMatch";
import { ZECHUB_CHAIN_ID, ZECHUB_DAO_CORE } from "./zechubConfig";
import { queryDaoSummary, queryProposal, queryReverseProposals } from "./zechubSource";

/** Scan depth: many grants match by title without issue# in proposal text */
const TITLE_MATCH_MAX_PAGES = 22;
const TITLE_MATCH_PAGE_SIZE = 40;
const TITLE_MATCH_MIN_SCORE = 0.72;

export async function fetchZechubDaoMeta(): Promise<ZechubDaoMeta> {
  const { name, proposalCount } = await queryDaoSummary();
  return {
    name,
    proposalCount,
    chainId: ZECHUB_CHAIN_ID,
    daoCoreAddress: ZECHUB_DAO_CORE,
  };
}

export function fetchZechubProposalById(proposalId: number): Promise<DaoProposalSingleRaw> {
  return queryProposal(proposalId);
}

interface ReverseRow {
  id: number;
  proposal: { title: string; description: string };
}

/**
 * Best-effort: scan recent ZecHub single-choice proposals for text pointing at this GitHub issue.
 * Issues and DAO proposals are independent; many grants still have a matching proposal without
 * a back-link in text, so absence of a hit is expected for some rows.
 */
export async function findZechubProposalIdByGithubIssue(
  issueNumber: number,
  maxPages = 14,
  pageSize = 40
): Promise<number | null> {
    const needles = [
    `/issues/${issueNumber}`,
    `issues/${issueNumber})`,
    `issues/${issueNumber} `,
    `issue/${issueNumber}`,
    `#${issueNumber}`,
    ` #${issueNumber} `,
  ];

  let startBefore: number | undefined;

  for (let page = 0; page < maxPages; page++) {
    const rows: ReverseRow[] = await queryReverseProposals(pageSize, startBefore);
    if (!Array.isArray(rows) || rows.length === 0) return null;

    for (const row of rows) {
      const text = `${row.proposal.title}\n${row.proposal.description}`;
      if (needles.some((n) => text.includes(n))) {
        return row.id;
      }
    }

    startBefore = rows[rows.length - 1].id;
    if (rows.length < pageSize) break;
  }

  return null;
}

/**
 * Match by normalized title (dates/parentheticals stripped). Picks the strongest score;
 * ties favor the higher proposal id (typically more recent).
 */
export async function findZechubProposalIdByGrantTitle(
  grantTitle: string
): Promise<number | null> {
  const trimmed = grantTitle?.trim();
  if (!trimmed) return null;

  let bestId: number | null = null;
  let bestScore = 0;

  let startBefore: number | undefined;

  for (let page = 0; page < TITLE_MATCH_MAX_PAGES; page++) {
    const rows: ReverseRow[] = await queryReverseProposals(TITLE_MATCH_PAGE_SIZE, startBefore);
    if (!Array.isArray(rows) || rows.length === 0) break;

    for (const row of rows) {
      const score = grantTitleMatchScore(trimmed, row.proposal.title);
      const better =
        score > bestScore ||
        (score === bestScore && score >= TITLE_MATCH_MIN_SCORE && row.id > (bestId ?? 0));
      if (better) {
        bestScore = score;
        bestId = row.id;
      }
    }

    startBefore = rows[rows.length - 1].id;
    if (rows.length < TITLE_MATCH_PAGE_SIZE) break;
  }

  if (bestId === null || bestScore < TITLE_MATCH_MIN_SCORE) return null;

  return bestId;
}

/** Top-N ZecHub proposals by title similarity (for related suggestions). */
export async function listZechubProposalsByTitleSimilarity(
  grantTitle: string,
  limit = 5,
  minScore = 0.55
): Promise<Array<{ id: number; title: string; score: number }>> {
  const trimmed = grantTitle?.trim();
  if (!trimmed) return [];

  const bestById = new Map<number, { title: string; score: number }>();

  let startBefore: number | undefined;

  for (let page = 0; page < TITLE_MATCH_MAX_PAGES; page++) {
    const rows: ReverseRow[] = await queryReverseProposals(TITLE_MATCH_PAGE_SIZE, startBefore);
    if (!Array.isArray(rows) || rows.length === 0) break;

    for (const row of rows) {
      const score = grantTitleMatchScore(trimmed, row.proposal.title);
      if (score < minScore) continue;
      const prev = bestById.get(row.id);
      if (!prev || score > prev.score) {
        bestById.set(row.id, { title: row.proposal.title, score });
      }
    }

    startBefore = rows[rows.length - 1].id;
    if (rows.length < TITLE_MATCH_PAGE_SIZE) break;
  }

  const ranked = [...bestById.entries()]
    .map(([id, v]) => ({ id, title: v.title, score: v.score }))
    .sort((a, b) => b.score - a.score || b.id - a.id);

  return ranked.slice(0, limit);
}
