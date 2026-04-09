import type { NextApiRequest, NextApiResponse } from "next";
import { normalizeZechubProposal } from "@/lib/daodao/normalize";
import type { ZechubProposalView } from "@/lib/daodao/types";
import { fetchZechubProposalById } from "@/lib/daodao/zechubIndexer";

type Ok = { proposal: ZechubProposalView };
type Err = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Ok | Err>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const idRaw = req.query.id;
  const id =
    typeof idRaw === "string" ? parseInt(idRaw, 10) : Number.NaN;
  if (Number.isNaN(id) || id < 1) {
    return res.status(400).json({ error: "Invalid id" });
  }

  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");

  try {
    const raw = await fetchZechubProposalById(id);
    return res.status(200).json({
      proposal: normalizeZechubProposal(raw),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Indexer error";
    return res.status(502).json({ error: msg });
  }
}
