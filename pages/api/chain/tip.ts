import type { NextApiRequest, NextApiResponse } from "next";
import { getChainTip, type ChainTip } from "@/lib/server/chainTip";

/** Current mainnet tip (height + block time). */
export default async function handler(req: NextApiRequest, res: NextApiResponse<ChainTip | { error: string }>) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  return res.status(200).json(await getChainTip());
}
