import type { NextApiRequest, NextApiResponse } from "next";
import { getGrantsSnapshot, toListGrant, type GrantsSnapshot } from "@/lib/server/grantsStore";

type ErrBody = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GrantsSnapshot | ErrBody>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const snap = await getGrantsSnapshot();
    // List pages don't render long-form fields; ?full=1 returns complete records.
    const body = req.query.full === "1" ? snap : { ...snap, grants: snap.grants.map(toListGrant) };
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=900"
    );
    return res.status(200).json(body);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return res.status(502).json({ error: msg });
  }
}
