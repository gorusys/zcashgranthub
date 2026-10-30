import type { NextApiRequest, NextApiResponse } from "next";
import { allEvents, buildIcs } from "@/lib/calendar";
import { SITE_URL } from "@/lib/publicApi";
import { getChainTip } from "@/lib/server/chainTip";

/** iCalendar feed (also served at /calendar.ics): retro round deadlines and protocol milestones. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }
  const tip = await getChainTip();
  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", 'inline; filename="zcash-grants.ics"');
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=43200");
  return res.status(200).send(buildIcs(allEvents(tip, SITE_URL)));
}
