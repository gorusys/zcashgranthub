import type { NextApiRequest, NextApiResponse } from "next";
import {
  DAO_DAO_INDEXER_BASE,
  ZECHUB_CHAIN_ID,
  ZECHUB_PROPOSAL_MODULE_SINGLE,
} from "@/lib/daodao/zechubConfig";

interface ReverseRow {
  id: number;
  proposal: {
    title: string;
    status: string;
    votes: { yes: string; no: string; abstain: string };
  };
  createdAt?: string;
}

type Ok = { items: ReverseRow[]; nextStartBefore: number | null };
type Err = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Ok | Err>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const limitRaw = req.query.limit;
  const startBeforeRaw = req.query.startBefore;
  const limit = Math.min(
    50,
    Math.max(1, parseInt(typeof limitRaw === "string" ? limitRaw : "20", 10) || 20)
  );
  const startBefore =
    typeof startBeforeRaw === "string" && startBeforeRaw.length > 0
      ? parseInt(startBeforeRaw, 10)
      : undefined;

  const base = `${DAO_DAO_INDEXER_BASE}/${ZECHUB_CHAIN_ID}/contract/${ZECHUB_PROPOSAL_MODULE_SINGLE}/daoProposalSingle/reverseProposals`;
  const url = new URL(base);
  url.searchParams.set("limit", String(limit));
  if (startBefore !== undefined && !Number.isNaN(startBefore)) {
    url.searchParams.set("startBefore", String(startBefore));
  }

  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");

  try {
    const r = await fetch(url.toString());
    if (!r.ok) {
      return res.status(502).json({ error: `Indexer ${r.status}` });
    }
    const rows = (await r.json()) as ReverseRow[];
    if (!Array.isArray(rows)) {
      return res.status(200).json({ items: [], nextStartBefore: null });
    }
    const last = rows[rows.length - 1];
    const nextStartBefore =
      rows.length > 0 && last ? last.id : null;
    return res.status(200).json({
      items: rows,
      nextStartBefore:
        rows.length >= limit && nextStartBefore != null
          ? nextStartBefore
          : null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Indexer error";
    return res.status(502).json({ error: msg });
  }
}
