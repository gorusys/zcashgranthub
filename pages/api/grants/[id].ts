import type { NextApiRequest, NextApiResponse } from "next";
import type { Grant } from "@/data/grantTypes";
import { getGrantDetail } from "@/lib/server/grantsStore";

type ErrBody = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ grant: Grant } | ErrBody>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const id = req.query.id;
  if (typeof id !== "string" || !id.trim()) {
    return res.status(400).json({ error: "Missing grant id" });
  }

  try {
    const grant = await getGrantDetail(id.trim());
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=120, stale-while-revalidate=600"
    );
    return res.status(200).json({ grant });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg.startsWith("Invalid grant id")) {
      return res.status(400).json({ error: msg });
    }
    const status = /\b404\b/.test(msg) ? 404 : 502;
    return res.status(status).json({ error: msg });
  }
}
