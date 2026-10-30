import type { NextApiRequest, NextApiResponse } from "next";
import { grantTitleMatchScore } from "@/lib/daodao/grantTitleMatch";
import { getZcgDecisions } from "@/lib/server/minutesStore";
import { decisionsForGrant, type ZcgDecision, type ZcgOutcome } from "@/lib/zcgMinutes";

type Ok = { decisions: ZcgDecision[]; total: number; meetings: number; listedAt: string | null };
type Err = { error: string };

const str = (v: string | string[] | undefined) => (typeof v === "string" ? v.trim() : "");

/**
 * ZCG committee decisions parsed from meeting minutes.
 *   ?forumLink=&title=   decisions about one grant (topic match, then title match)
 *   ?q=&outcome=&limit=  search the archive
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse<Ok | Err>) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const snap = await getZcgDecisions();
    let list = snap.decisions;

    const forumLink = str(req.query.forumLink);
    const title = str(req.query.title);
    if (forumLink || title) {
      list = decisionsForGrant(list, { forumLink, title }, grantTitleMatchScore);
    }
    const outcome = str(req.query.outcome) as ZcgOutcome | "";
    if (outcome) list = list.filter((d) => d.outcome === outcome);
    const q = str(req.query.q).toLowerCase();
    if (q) {
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.summary.toLowerCase().includes(q) ||
          d.statements.some((s) => s.text.toLowerCase().includes(q))
      );
    }
    const total = list.length;
    const limit = Math.min(Math.max(Number(req.query.limit) || 500, 1), 2000);

    res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=3600");
    return res.status(200).json({
      decisions: list.slice(0, limit),
      total,
      meetings: snap.meetings,
      listedAt: snap.listedAt,
    });
  } catch (e) {
    return res.status(502).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}
