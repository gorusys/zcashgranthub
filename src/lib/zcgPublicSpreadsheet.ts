import { parseCsv } from "@/lib/parseCsv";

/** Public ZCG + Coinholder dashboard workbook (view-only link). */
export const ZCG_PUBLIC_SPREADSHEET_ID =
  "1FQ28rDCyRW0TiNxrm3rgD8ai2KGUsXAjPieQmI1kKKg";

export const ZCG_PUBLIC_SPREADSHEET_URL = `https://docs.google.com/spreadsheets/d/${ZCG_PUBLIC_SPREADSHEET_ID}/edit`;

/**
 * All worksheet gids exposed by `htmlview` CSV export for this workbook (13 tabs).
 * Names match the visible tab titles in the spreadsheet UI.
 */
export const ZCG_PUBLIC_SHEET_GIDS = {
  /** ZCG Dashboard */
  zcgDashboard: 135980745,
  /** Coinholder Dashboard */
  coinholderDashboard: 808560406,
  /** ZCG Grants */
  zcgGrants: 803214474,
  /** ZCG IC Payouts */
  zcgIcPayouts: 1267338970,
  /** Coinholder Grants */
  coinholderGrants: 722519692,
  /** ZCG Liquidity */
  zcgLiquidity: 1024670602,
  /** ZCG 2026 Disc. Budget */
  zcg2026DiscBudget: 2043949055,
  /** ZCG 2026 Stipend */
  zcg2026Stipend: 598263567,
  /** ZCG Funds Distribution */
  zcgFundsDistribution: 164877840,
  /** Coinholder Funds Distribution */
  coinholderFundsDistribution: 1885743444,
  /** ZCG All Grants Tracking */
  zcgAllGrantsTracking: 1164534734,
  /** Coinholder All Grants Tracking */
  coinholderAllGrantsTracking: 1847584751,
  /** Inputs */
  inputs: 892150625,
} as const;

export type TreasurySensitivityRow = {
  zecUsdPrice: number;
  budgetZec: number;
  percentTreasuryCommitted: number;
  usdTotal: number;
};

export type ParsedPublicDashboard = {
  /** Raw label → display value (column B) for summary lines */
  metrics: Record<string, string>;
  status: string | null;
  blockHeight: string | null;
  blockTime: string | null;
  zecUsdPriceDisplay: string | null;
  /** Stress table: current assets & liabilities */
  sensitivityCurrent: TreasurySensitivityRow[];
  /** Stress table: including receivables through third dev fund (ZCG only; may be empty for Coinholder) */
  sensitivityWithReceivable: TreasurySensitivityRow[];
};

export function stripCell(s: string | undefined): string {
  return (s ?? "").trim();
}

export function parseMoneyToNumber(s: string): number | null {
  const t = s.replace(/\u00a0/g, " ").replace(/,/g, "").trim();
  if (!t) return null;
  const neg = /^-\s*\$/.test(t) || t.startsWith("-$") || t.startsWith("- $");
  const num = t.replace(/^\$/, "").replace(/^-\s*\$/, "").replace(/^-\$/, "").replace(/^\(/, "").replace(/\)$/, "").trim();
  const n = parseFloat(num.replace(/[^0-9.-]/g, ""));
  if (Number.isNaN(n)) return null;
  return neg || t.includes("(") ? -Math.abs(n) : n;
}

export function parsePercentToNumber(s: string): number | null {
  const t = s.replace(/,/g, "").trim();
  const m = t.match(/-?[\d.]+/);
  if (!m) return null;
  const n = parseFloat(m[0]!);
  return Number.isNaN(n) ? null : n;
}

export function parseZecAmount(s: string): number | null {
  const t = s.replace(/,/g, "").trim();
  const n = parseFloat(t);
  return Number.isNaN(n) ? null : n;
}

function parsePriceCell(s: string): number | null {
  return parseMoneyToNumber(s.replace(/^\$/, "$"));
}

function rowStartsWithPrice(rows: string[][], startIdx: number): boolean {
  const c0 = stripCell(rows[startIdx]?.[0]);
  return c0.startsWith("$") && /\d/.test(c0);
}

function parseSensitivityRows(
  rows: string[][],
  startIdx: number,
  columnCount: 4 | 5
): { rows: TreasurySensitivityRow[]; nextIdx: number } {
  const out: TreasurySensitivityRow[] = [];
  let j = startIdx;
  while (j < rows.length && rowStartsWithPrice(rows, j)) {
    const r = rows[j]!;
    const price = parsePriceCell(stripCell(r[0])) ?? 0;
    let budgetZec: number;
    let pct: number;
    let usd: number;
    if (columnCount === 5) {
      budgetZec = parseZecAmount(stripCell(r[2])) ?? 0;
      pct = parsePercentToNumber(stripCell(r[3])) ?? 0;
      usd = parseMoneyToNumber(stripCell(r[4])) ?? 0;
    } else {
      budgetZec = parseZecAmount(stripCell(r[1])) ?? 0;
      pct = parsePercentToNumber(stripCell(r[2])) ?? 0;
      usd = parseMoneyToNumber(stripCell(r[3])) ?? 0;
    }
    out.push({
      zecUsdPrice: price,
      budgetZec,
      percentTreasuryCommitted: pct,
      usdTotal: usd,
    });
    j += 1;
  }
  return { rows: out, nextIdx: j };
}

function headerColumnCount(row: string[] | undefined): number {
  if (!row) return 0;
  let n = 0;
  for (let i = row.length - 1; i >= 0; i--) {
    if (stripCell(row[i])) {
      n = i + 1;
      break;
    }
  }
  return n;
}

export function parsePublicDashboardCsv(csvText: string): ParsedPublicDashboard {
  const rows = parseCsv(csvText);
  const metrics: Record<string, string> = {};

  for (const r of rows) {
    const k = stripCell(r[0]);
    const v = stripCell(r[1]);
    if (k && v && !k.startsWith("$")) {
      metrics[k] = v;
    }
  }

  const status = metrics["Status:"] ?? null;
  const blockHeight =
    metrics["Coinbase address balance as of block height:"] ??
    metrics["Coinholder Grants balance as of block height:"] ??
    null;
  const blockTime = metrics["Block time (UTC):"] ?? null;
  const zecUsdPriceDisplay = metrics["ZECUSD price:"] ?? null;

  const sensitivityCurrent: TreasurySensitivityRow[] = [];
  const sensitivityWithReceivable: TreasurySensitivityRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    if (stripCell(rows[i]?.[0]) !== "ZEC/USD Price") continue;
    const hdr = rows[i];
    const cols = headerColumnCount(hdr);
    const isFive = cols >= 5;
    const isFour = cols === 4;
    if (!isFive && !isFour) continue;
    if (i + 1 >= rows.length || !rowStartsWithPrice(rows, i + 1)) continue;

    const { rows: block } = parseSensitivityRows(
      rows,
      i + 1,
      isFive ? 5 : 4
    );

    if (block.length === 0) continue;

    if (sensitivityCurrent.length === 0) {
      sensitivityCurrent.push(...block);
    } else if (sensitivityWithReceivable.length === 0) {
      sensitivityWithReceivable.push(...block);
    }
  }

  return {
    metrics,
    status,
    blockHeight,
    blockTime,
    zecUsdPriceDisplay,
    sensitivityCurrent,
    sensitivityWithReceivable,
  };
}

export function spreadsheetExportCsvUrl(gid: number): string {
  return `https://docs.google.com/spreadsheets/d/${ZCG_PUBLIC_SPREADSHEET_ID}/export?format=csv&gid=${gid}`;
}
