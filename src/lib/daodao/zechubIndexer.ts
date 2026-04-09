import type { DaoProposalSingleRaw, ZechubDaoMeta } from "./types";
import { grantTitleMatchScore } from "./grantTitleMatch";
import {
  DAO_DAO_INDEXER_BASE,
  ZECHUB_CHAIN_ID,
  ZECHUB_DAO_CORE,
  ZECHUB_PROPOSAL_MODULE_SINGLE,
} from "./zechubConfig";

/** Scan depth: many grants match by title without issue# in proposal text */
const TITLE_MATCH_MAX_PAGES = 22;
const TITLE_MATCH_PAGE_SIZE = 40;
const TITLE_MATCH_MIN_SCORE = 0.72;

function indexerUrl(path: string): string {
  return `${DAO_DAO_INDEXER_BASE}/${ZECHUB_CHAIN_ID}${path}`;
}

export async function fetchZechubDaoDumpState(): Promise<{
  config: { name: string };
  proposalCount: number;
}> {
  const res = await fetch(indexerUrl(`/contract/${ZECHUB_DAO_CORE}/daoCore/dumpState`));
  if (!res.ok) {
    throw new Error(`DAO DAO indexer dumpState: ${res.status}`);
  }
  const data = (await res.json()) as {
    config: { name: string };
    proposalCount: number;
  };
  return data;
}

export async function fetchZechubDaoMeta(): Promise<ZechubDaoMeta> {
  const dump = await fetchZechubDaoDumpState();
  return {
    name: dump.config.name,
    proposalCount: dump.proposalCount,
    chainId: ZECHUB_CHAIN_ID,
    daoCoreAddress: ZECHUB_DAO_CORE,
  };
}

export async function fetchZechubProposalById(
  proposalId: number
): Promise<DaoProposalSingleRaw> {
  const url = new URL(
    indexerUrl(
      `/contract/${ZECHUB_PROPOSAL_MODULE_SINGLE}/daoProposalSingle/proposal`
    )
  );
  url.searchParams.set("id", String(proposalId));

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`DAO DAO proposal ${proposalId}: ${res.status}`);
  }
  return res.json() as Promise<DaoProposalSingleRaw>;
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
    const url = new URL(
      indexerUrl(
        `/contract/${ZECHUB_PROPOSAL_MODULE_SINGLE}/daoProposalSingle/reverseProposals`
      )
    );
    url.searchParams.set("limit", String(pageSize));
    if (startBefore !== undefined) {
      url.searchParams.set("startBefore", String(startBefore));
    }

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`DAO DAO reverseProposals: ${res.status}`);
    }
    const rows = (await res.json()) as ReverseRow[];
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
    const url = new URL(
      indexerUrl(
        `/contract/${ZECHUB_PROPOSAL_MODULE_SINGLE}/daoProposalSingle/reverseProposals`
      )
    );
    url.searchParams.set("limit", String(TITLE_MATCH_PAGE_SIZE));
    if (startBefore !== undefined) {
      url.searchParams.set("startBefore", String(startBefore));
    }

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`DAO DAO reverseProposals: ${res.status}`);
    }
    const rows = (await res.json()) as ReverseRow[];
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
