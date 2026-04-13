/**
 * ZecHub DAO (DAO DAO) read API. GitHub grant issues and on-chain proposals are independent.
 * Resolution order: explicit proposal id in issue → proposal text cites this GitHub issue →
 * title match (normalized; many proposals never link the issue URL).
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { normalizeZechubProposal } from "@/lib/daodao/normalize";
import type { ZechubProposalView, ZechubDaoMeta } from "@/lib/daodao/types";
import {
  fetchZechubDaoMeta,
  fetchZechubProposalById,
  findZechubProposalIdByGithubIssue,
  findZechubProposalIdByGrantTitle,
} from "@/lib/daodao/zechubIndexer";

type OkResponse = {
  dao: ZechubDaoMeta;
  proposal: ZechubProposalView | null;
  resolution:
    | "by_id"
    | "by_github_issue"
    | "by_grant_title"
    | "parsed_id_failed_lookup"
    | "none";
};

type ErrResponse = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OkResponse | ErrResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const proposalIdRaw = req.query.proposalId;
  const githubIssueRaw = req.query.githubIssue;
  const grantTitleRaw = req.query.grantTitle;

  let parsedProposalId: number | null = null;
  if (typeof proposalIdRaw === "string" && proposalIdRaw.length > 0) {
    const n = parseInt(proposalIdRaw, 10);
    if (Number.isNaN(n) || n < 1) {
      return res.status(400).json({ error: "Invalid proposalId" });
    }
    parsedProposalId = n;
  }

  let githubIssue: number | null = null;
  if (typeof githubIssueRaw === "string" && githubIssueRaw.length > 0) {
    const n = parseInt(githubIssueRaw, 10);
    if (Number.isNaN(n) || n < 1) {
      return res.status(400).json({ error: "Invalid githubIssue" });
    }
    githubIssue = n;
  }

  const grantTitle =
    typeof grantTitleRaw === "string" && grantTitleRaw.trim().length > 0
      ? grantTitleRaw.trim()
      : null;

  if (
    parsedProposalId === null &&
    githubIssue === null &&
    (grantTitle === null || grantTitle.length === 0)
  ) {
    return res.status(400).json({
      error:
        "Provide proposalId, githubIssue, and/or grantTitle query parameters.",
    });
  }

  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");

  try {
    const dao = await fetchZechubDaoMeta();

    let resolvedId: number | null = parsedProposalId;
    let resolution: OkResponse["resolution"] = "none";

    if (resolvedId !== null) {
      resolution = "by_id";
    } else if (githubIssue !== null) {
      const fromIssueText = await findZechubProposalIdByGithubIssue(githubIssue);
      if (fromIssueText !== null) {
        resolvedId = fromIssueText;
        resolution = "by_github_issue";
      } else if (grantTitle !== null) {
        const fromTitle = await findZechubProposalIdByGrantTitle(grantTitle);
        if (fromTitle !== null) {
          resolvedId = fromTitle;
          resolution = "by_grant_title";
        }
      }
    } else if (grantTitle !== null) {
      const fromTitle = await findZechubProposalIdByGrantTitle(grantTitle);
      if (fromTitle !== null) {
        resolvedId = fromTitle;
        resolution = "by_grant_title";
      }
    }

    if (resolvedId === null) {
      return res.status(200).json({
        dao,
        proposal: null,
        resolution: "none",
      });
    }

    try {
      const raw = await fetchZechubProposalById(resolvedId);
      return res.status(200).json({
        dao,
        proposal: normalizeZechubProposal(raw),
        resolution,
      });
    } catch {
      return res.status(200).json({
        dao,
        proposal: null,
        resolution:
          parsedProposalId !== null ? "parsed_id_failed_lookup" : "none",
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "DAO DAO indexer error";
    return res.status(502).json({ error: msg });
  }
}
