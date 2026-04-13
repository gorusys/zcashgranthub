import type { NextApiRequest, NextApiResponse } from "next";
import {
  ZCG_PUBLIC_SPREADSHEET_URL,
  ZCG_PUBLIC_SHEET_GIDS,
  parsePublicDashboardCsv,
  spreadsheetExportCsvUrl,
} from "@/lib/zcgPublicSpreadsheet";
import type { PublicSpreadsheetPayload } from "@/lib/zcgSpreadsheetPayload";
import {
  parseCoinholderGrantsCsv,
  parseCoinholderTrackingCsv,
  parseDiscBudgetCsv,
  parseFundsDistributionCsv,
  parseIcPayoutsCsv,
  parseInputsCsv,
  parseLiquidityCsv,
  parseStipendCsv,
  parseZcgGrantsCsv,
  parseZcgTrackingCsv,
} from "@/lib/zcgSheetParsers";

type ErrBody = { error: string };

async function fetchCsv(gid: number): Promise<string> {
  const url = spreadsheetExportCsvUrl(gid);
  const res = await fetch(url, {
    redirect: "follow",
    headers: { Accept: "text/csv,*/*" },
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) {
    throw new Error(`Sheet export failed (${res.status}) for gid ${gid}`);
  }
  const text = await res.text();
  if (text.trimStart().startsWith("<!DOCTYPE")) {
    throw new Error(`Invalid CSV response for gid ${gid}`);
  }
  return text;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PublicSpreadsheetPayload | ErrBody>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const g = ZCG_PUBLIC_SHEET_GIDS;
    const [
      zcgCsv,
      chCsv,
      inputsCsv,
      zcgGrantsCsv,
      icCsv,
      coinholderGrantsCsv,
      liquidityCsv,
      discCsv,
      stipendCsv,
      zfdCsv,
      cfdCsv,
      zTrackCsv,
      chTrackCsv,
    ] = await Promise.all([
      fetchCsv(g.zcgDashboard),
      fetchCsv(g.coinholderDashboard),
      fetchCsv(g.inputs),
      fetchCsv(g.zcgGrants),
      fetchCsv(g.zcgIcPayouts),
      fetchCsv(g.coinholderGrants),
      fetchCsv(g.zcgLiquidity),
      fetchCsv(g.zcg2026DiscBudget),
      fetchCsv(g.zcg2026Stipend),
      fetchCsv(g.zcgFundsDistribution),
      fetchCsv(g.coinholderFundsDistribution),
      fetchCsv(g.zcgAllGrantsTracking),
      fetchCsv(g.coinholderAllGrantsTracking),
    ]);

    const body: PublicSpreadsheetPayload = {
      sourceUrl: ZCG_PUBLIC_SPREADSHEET_URL,
      fetchedAt: new Date().toISOString(),
      zcg: parsePublicDashboardCsv(zcgCsv),
      coinholder: parsePublicDashboardCsv(chCsv),
      inputs: parseInputsCsv(inputsCsv),
      zcgGrants: parseZcgGrantsCsv(zcgGrantsCsv),
      icPayouts: parseIcPayoutsCsv(icCsv),
      coinholderGrants: parseCoinholderGrantsCsv(coinholderGrantsCsv),
      liquidity: parseLiquidityCsv(liquidityCsv),
      discBudget2026: parseDiscBudgetCsv(discCsv),
      stipend: parseStipendCsv(stipendCsv),
      zcgFundsDistribution: parseFundsDistributionCsv(zfdCsv),
      coinholderFundsDistribution: parseFundsDistributionCsv(cfdCsv),
      zcgAllGrantsTracking: parseZcgTrackingCsv(zTrackCsv),
      coinholderAllGrantsTracking: parseCoinholderTrackingCsv(chTrackCsv),
    };

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=600"
    );
    return res.status(200).json(body);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return res.status(502).json({ error: msg });
  }
}
