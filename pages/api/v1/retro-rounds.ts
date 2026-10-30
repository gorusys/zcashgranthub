import type { NextApiRequest, NextApiResponse } from "next";
import { getGrantsSnapshot } from "@/lib/server/grantsStore";
import { publicRetroRounds, type PublicRetroRound } from "@/lib/publicApi";

type Ok = { generatedAt: string; rounds: PublicRetroRound[] };
type Err = { error: string };

/** Public, CORS-enabled Coinholder retro round schedule, current phase and outcomes. */
export default async function handler(req: NextApiRequest, res: NextApiResponse<Ok | Err>) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  // Schedule and phase don't depend on GitHub; outcomes degrade to empty if it's unavailable.
  const grants = await getGrantsSnapshot()
    .then((s) => s.grants)
    .catch(() => []);
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=900");
  return res.status(200).json({ generatedAt: new Date().toISOString(), rounds: publicRetroRounds(grants) });
}
