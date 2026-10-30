import type { NextApiRequest, NextApiResponse } from "next";
import { getGrantsSnapshot } from "@/lib/server/grantsStore";
import { filterGrants, grantsRss } from "@/lib/publicApi";

/** RSS 2.0 feed of recently updated grants (also served at /feed.xml). Optional ?program= */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }
  try {
    const { grants } = await getGrantsSnapshot();
    const program = typeof req.query.program === "string" ? req.query.program : undefined;
    res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=1800");
    return res.status(200).send(grantsRss(filterGrants(grants, { program })));
  } catch {
    return res.status(502).send("Feed temporarily unavailable");
  }
}
