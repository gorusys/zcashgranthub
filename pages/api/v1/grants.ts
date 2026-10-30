import type { NextApiRequest, NextApiResponse } from "next";
import { getGrantsSnapshot } from "@/lib/server/grantsStore";
import { filterGrants, toPublicGrant, type PublicGrant } from "@/lib/publicApi";

type Ok = { fetchedAt: string; count: number; grants: PublicGrant[] };
type Err = { error: string };

const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

/** Public, CORS-enabled list of grants. Filters: program, status (comma list), category, q, updatedSince. */
export default async function handler(req: NextApiRequest, res: NextApiResponse<Ok | Err>) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { grants, fetchedAt } = await getGrantsSnapshot();
    const filtered = filterGrants(grants, {
      program: str(req.query.program),
      status: str(req.query.status),
      category: str(req.query.category),
      q: str(req.query.q),
      updatedSince: str(req.query.updatedSince),
    });
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=900");
    return res.status(200).json({ fetchedAt, count: filtered.length, grants: filtered.map(toPublicGrant) });
  } catch (e) {
    return res.status(502).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}
