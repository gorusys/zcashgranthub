import type { NextApiRequest, NextApiResponse } from "next";
import type { RelatedItem } from "@/lib/related/resolveRelated";
import { resolveRelatedForZechubProposal } from "@/lib/related/resolveRelated";

type Ok = { related: RelatedItem[] };
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
  const title = req.query.title;

  const id =
    typeof idRaw === "string" ? parseInt(idRaw, 10) : Number.NaN;
  if (Number.isNaN(id) || id < 1) {
    return res.status(400).json({ error: "Invalid proposal id" });
  }
  if (typeof title !== "string") {
    return res.status(400).json({ error: "Missing title" });
  }

  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");

  try {
    const related = await resolveRelatedForZechubProposal({
      proposalId: id,
      title: title.trim(),
    });
    return res.status(200).json({ related });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to resolve related";
    return res.status(502).json({ error: msg });
  }
}
