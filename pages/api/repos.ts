import type { NextApiRequest, NextApiResponse } from "next";
import type { RepoStats } from "@/lib/repoStats";
import { getRepoStats } from "@/lib/server/repoStatsStore";

const MAX = 30;
const SLUG = /^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}$/;

/** Activity stats for up to 30 repos: ?repos=owner/name,owner/name. Cached 24 h. */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ stats: Record<string, RepoStats | null> } | { error: string }>
) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const raw = typeof req.query.repos === "string" ? req.query.repos : "";
  const repos = [...new Set(raw.split(",").map((r) => r.trim()).filter(Boolean))];
  if (repos.length === 0) return res.status(400).json({ error: "Pass ?repos=owner/name,..." });
  if (repos.length > MAX) return res.status(400).json({ error: `At most ${MAX} repos per request` });
  const bad = repos.find((r) => !SLUG.test(r));
  if (bad) return res.status(400).json({ error: `Invalid repo: ${bad}` });

  const stats = await getRepoStats(repos);
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  return res.status(200).json({ stats });
}
