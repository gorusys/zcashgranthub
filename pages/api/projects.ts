import type { NextApiRequest, NextApiResponse } from "next";
import { buildProjects, type CoreRepoFunding, type Project } from "@/lib/projects";
import { getGrantsSnapshot } from "@/lib/server/grantsStore";

type Ok = { fetchedAt: string; projects: Project[]; core: CoreRepoFunding[] };

let memo: { fetchedAt: string; body: Ok } | null = null;

/** Funded grants grouped by applicant, plus which grants touch each core repo. No extra GitHub calls. */
export default async function handler(req: NextApiRequest, res: NextApiResponse<Ok | { error: string }>) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const snap = await getGrantsSnapshot();
    if (!memo || memo.fetchedAt !== snap.fetchedAt) {
      memo = { fetchedAt: snap.fetchedAt, body: { fetchedAt: snap.fetchedAt, ...buildProjects(snap.grants) } };
    }
    res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=3600");
    return res.status(200).json(memo.body);
  } catch (e) {
    return res.status(502).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}
