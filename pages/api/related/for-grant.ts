import type { NextApiRequest, NextApiResponse } from "next";
import { parseGrantRouteId } from "@/lib/grantPrograms";
import type { GrantProgram } from "@/lib/grantPrograms";
import type { RelatedItem } from "@/lib/related/resolveRelated";
import { resolveRelatedForGithubGrant } from "@/lib/related/resolveRelated";

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

  const grantKey = req.query.grantKey;
  const title = req.query.title;

  if (typeof grantKey !== "string" || !grantKey.trim()) {
    return res.status(400).json({ error: "Missing grantKey" });
  }
  if (typeof title !== "string") {
    return res.status(400).json({ error: "Missing title" });
  }

  let program: GrantProgram;
  let issueNumber: number;
  try {
    const parsed = parseGrantRouteId(grantKey.trim());
    program = parsed.program;
    issueNumber = parsed.issueNumber;
  } catch {
    return res.status(400).json({ error: "Invalid grantKey" });
  }

  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");

  try {
    const related = await resolveRelatedForGithubGrant({
      program,
      issueNumber,
      title: title.trim(),
    });
    return res.status(200).json({ related });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to resolve related";
    return res.status(502).json({ error: msg });
  }
}
