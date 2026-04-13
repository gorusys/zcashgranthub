import type { NextApiRequest, NextApiResponse } from "next";
import type { ZechubDaoMeta } from "@/lib/daodao/types";
import { fetchZechubDaoMeta } from "@/lib/daodao/zechubIndexer";

type Ok = { dao: ZechubDaoMeta };
type Err = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Ok | Err>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");

  try {
    const dao = await fetchZechubDaoMeta();
    return res.status(200).json({ dao });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "DAO DAO indexer error";
    return res.status(502).json({ error: msg });
  }
}
