import type { NextApiRequest, NextApiResponse } from "next";
import { getOpportunities, type OpportunitiesSnapshot } from "@/lib/server/opportunitiesStore";

/** Open ZecHub bounties and beginner-friendly GitHub issues across Zcash orgs. */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OpportunitiesSnapshot | { error: string }>
) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const snap = await getOpportunities();
  res.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=3600");
  return res.status(200).json(snap);
}
