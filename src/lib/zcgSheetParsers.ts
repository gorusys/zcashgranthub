import { parseCsv } from "@/lib/parseCsv";
import {
  parseMoneyToNumber,
  parseZecAmount,
  stripCell,
} from "@/lib/zcgPublicSpreadsheet";

function normHeader(s: string): string {
  return s.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

function findHeaderRow(
  rows: string[][],
  test: (cells: string[]) => boolean
): number {
  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    if (test(rows[i]!.map(stripCell))) return i;
  }
  return -1;
}

function colByHeaders(
  headers: string[],
  predicate: (n: string) => boolean
): number {
  return headers.findIndex((h) => predicate(normHeader(h)));
}

// —— ZCG Grants (milestone lines) ——
export type ZcgGrantRow = {
  project: string;
  grantee: string;
  category: string;
  milestone: string;
  amountUsd: number | null;
  zecDisbursed: number | null;
  usdDisbursed: number | null;
  grantStatus: string;
};

export function parseZcgGrantsCsv(csv: string): {
  rows: ZcgGrantRow[];
  byStatus: { name: string; count: number }[];
  byCategory: { name: string; milestones: number; amountUsd: number }[];
  topProjectsByZec: { name: string; zec: number }[];
  totals: { milestoneRows: number; sumAmountUsd: number; sumZec: number };
} {
  const rows = parseCsv(csv);
  const hi = findHeaderRow(
    rows,
    (c) => normHeader(c[0] ?? "") === "project" && normHeader(c[1] ?? "") === "grantee"
  );
  if (hi < 0)
    return {
      rows: [],
      byStatus: [],
      byCategory: [],
      topProjectsByZec: [],
      totals: { milestoneRows: 0, sumAmountUsd: 0, sumZec: 0 },
    };

  const H = rows[hi]!;
  const iAmt = colByHeaders(
    H,
    (n) => n.includes("amount") && n.includes("usd") && !n.includes("disbursed")
  );
  const iZec = colByHeaders(H, (n) => n.includes("zec") && n.includes("disbursed"));
  const iUsdD = colByHeaders(H, (n) => n.includes("usd") && n.includes("disbursed"));
  const iStat = colByHeaders(H, (n) => n.includes("grant") && n.includes("status"));
  const iMil = colByHeaders(H, (n) => n.includes("milestone"));
  const iCat = colByHeaders(H, (n) => n.includes("category"));
  const iProj = 0;
  const iGrantee = 1;

  const out: ZcgGrantRow[] = [];
  const statusCount: Record<string, number> = {};
  const catAgg: Record<string, { n: number; usd: number }> = {};
  const zecByProject: Record<string, number> = {};
  let sumAmountUsd = 0;
  let sumZec = 0;

  for (let r = hi + 1; r < rows.length; r++) {
    const line = rows[r]!;
    const project = stripCell(line[iProj]);
    if (!project) continue;

    const grantStatus = stripCell(line[iStat] ?? "");
    const category = stripCell(line[iCat] ?? "") || "Uncategorized";
    const milestone = stripCell(line[iMil] ?? "");
    const amountUsd = parseMoneyToNumber(stripCell(line[iAmt] ?? ""));
    const zecDisbursed = parseZecAmount(stripCell(line[iZec] ?? ""));
    const usdDisbursed = parseMoneyToNumber(stripCell(line[iUsdD] ?? ""));

    if (amountUsd != null) sumAmountUsd += amountUsd;
    if (zecDisbursed != null) {
      sumZec += zecDisbursed;
      zecByProject[project] = (zecByProject[project] ?? 0) + zecDisbursed;
    }

    statusCount[grantStatus || "Unknown"] =
      (statusCount[grantStatus || "Unknown"] ?? 0) + 1;
    if (!catAgg[category]) catAgg[category] = { n: 0, usd: 0 };
    catAgg[category]!.n += 1;
    if (amountUsd != null) catAgg[category]!.usd += amountUsd;

    out.push({
      project,
      grantee: stripCell(line[iGrantee]),
      category,
      milestone,
      amountUsd,
      zecDisbursed,
      usdDisbursed,
      grantStatus: grantStatus || "Unknown",
    });
  }

  const byStatus = Object.entries(statusCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const byCategory = Object.entries(catAgg)
    .map(([name, v]) => ({
      name,
      milestones: v.n,
      amountUsd: Math.round(v.usd),
    }))
    .sort((a, b) => b.amountUsd - a.amountUsd);

  const topProjectsByZec = Object.entries(zecByProject)
    .map(([name, zec]) => ({ name, zec: Math.round(zec * 100) / 100 }))
    .sort((a, b) => b.zec - a.zec)
    .slice(0, 12);

  return {
    rows: out,
    byStatus,
    byCategory,
    topProjectsByZec,
    totals: {
      milestoneRows: out.length,
      sumAmountUsd: Math.round(sumAmountUsd),
      sumZec: Math.round(sumZec * 100) / 100,
    },
  };
}

// —— IC payouts ——
export type IcPayoutRow = {
  project: string;
  ic: string;
  deliverable: string;
  category: string;
  amountUsd: number | null;
  zecDisbursed: number | null;
};

export function parseIcPayoutsCsv(csv: string): {
  rows: IcPayoutRow[];
  byCategory: { name: string; count: number; zec: number }[];
  totals: { lines: number; sumZec: number };
} {
  const rows = parseCsv(csv);
  const hi = findHeaderRow(
    rows,
    (c) =>
      normHeader(c[0] ?? "") === "project" &&
      normHeader(c[1] ?? "").includes("independent contractor")
  );
  if (hi < 0)
    return { rows: [], byCategory: [], totals: { lines: 0, sumZec: 0 } };

  const H = rows[hi]!;
  const iProj = 0;
  const iIc = 1;
  const iDel = 2;
  const iCat = 3;
  const iAmt = colByHeaders(
    H,
    (n) => n.includes("amount") && n.includes("usd")
  );
  const iZec = colByHeaders(H, (n) => n.includes("zec") && n.includes("disbursed"));

  const out: IcPayoutRow[] = [];
  const catAgg: Record<string, { n: number; zec: number }> = {};
  let sumZec = 0;

  for (let r = hi + 1; r < rows.length; r++) {
    const line = rows[r]!;
    const project = stripCell(line[iProj]);
    if (!project) continue;
    const zec = parseZecAmount(stripCell(line[iZec] ?? ""));
    const category = stripCell(line[iCat] ?? "") || "Other";
    if (zec != null) sumZec += zec;
    if (!catAgg[category]) catAgg[category] = { n: 0, zec: 0 };
    catAgg[category]!.n += 1;
    if (zec != null) catAgg[category]!.zec += zec;

    out.push({
      project,
      ic: stripCell(line[iIc]),
      deliverable: stripCell(line[iDel]),
      category,
      amountUsd: parseMoneyToNumber(stripCell(line[iAmt] ?? "")),
      zecDisbursed: zec,
    });
  }

  const byCategory = Object.entries(catAgg)
    .map(([name, v]) => ({
      name,
      count: v.n,
      zec: Math.round(v.zec * 100) / 100,
    }))
    .sort((a, b) => b.zec - a.zec);

  return {
    rows: out,
    byCategory,
    totals: { lines: out.length, sumZec: Math.round(sumZec * 100) / 100 },
  };
}

// —— Coinholder Grants ——
export type CoinholderGrantRow = {
  project: string;
  grantee: string;
  category: string;
  amountUsd: number | null;
  zecDisbursed: number | null;
  grantStatus: string;
};

export function parseCoinholderGrantsCsv(csv: string): {
  rows: CoinholderGrantRow[];
  byStatus: { name: string; count: number }[];
  byCategory: { name: string; count: number; amountUsd: number }[];
  totals: { rows: number; sumAmountUsd: number; sumZec: number };
} {
  const rows = parseCsv(csv);
  const hi = findHeaderRow(
    rows,
    (c) =>
      normHeader(c[0] ?? "") === "project" &&
      normHeader(c[2] ?? "") === "category"
  );
  if (hi < 0)
    return {
      rows: [],
      byStatus: [],
      byCategory: [],
      totals: { rows: 0, sumAmountUsd: 0, sumZec: 0 },
    };

  const H = rows[hi]!;
  const iAmt = colByHeaders(
    H,
    (n) => n.includes("amount") && n.includes("usd")
  );
  const iZec = colByHeaders(H, (n) => n.includes("zec") && n.includes("disbursed"));
  const iStat = colByHeaders(H, (n) => n.includes("grant") && n.includes("status"));

  const out: CoinholderGrantRow[] = [];
  const st: Record<string, number> = {};
  const cat: Record<string, { n: number; usd: number }> = {};
  let sumAmountUsd = 0;
  let sumZec = 0;

  for (let r = hi + 1; r < rows.length; r++) {
    const line = rows[r]!;
    const project = stripCell(line[0]);
    if (!project) continue;
    const grantStatus = stripCell(line[iStat] ?? "");
    const category = stripCell(line[2] ?? "") || "Uncategorized";
    const amountUsd = parseMoneyToNumber(stripCell(line[iAmt] ?? ""));
    const zec = parseZecAmount(stripCell(line[iZec] ?? ""));
    if (amountUsd != null) sumAmountUsd += amountUsd;
    if (zec != null) sumZec += zec;

    st[grantStatus || "Unknown"] = (st[grantStatus || "Unknown"] ?? 0) + 1;
    if (!cat[category]) cat[category] = { n: 0, usd: 0 };
    cat[category]!.n += 1;
    if (amountUsd != null) cat[category]!.usd += amountUsd;

    out.push({
      project,
      grantee: stripCell(line[1]),
      category,
      amountUsd,
      zecDisbursed: zec,
      grantStatus: grantStatus || "Unknown",
    });
  }

  return {
    rows: out,
    byStatus: Object.entries(st)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    byCategory: Object.entries(cat)
      .map(([name, v]) => ({
        name,
        count: v.n,
        amountUsd: Math.round(v.usd),
      }))
      .sort((a, b) => b.amountUsd - a.amountUsd),
    totals: {
      rows: out.length,
      sumAmountUsd: Math.round(sumAmountUsd),
      sumZec: Math.round(sumZec * 100) / 100,
    },
  };
}

// —— Liquidity ——
export type LiquidityTransfer = {
  project: string;
  amountUsd: number | null;
  transferred: string;
  zecTransferred: number | null;
  zecUsd: number | null;
};

export function parseLiquidityCsv(csv: string): {
  transfers: LiquidityTransfer[];
  kpis: { label: string; value: string }[];
  sumZecTransferred: number;
} {
  const rows = parseCsv(csv);
  const hi = findHeaderRow(
    rows,
    (c) => normHeader(c[0] ?? "") === "project" && normHeader(c[1] ?? "").includes("amount")
  );
  const transfers: LiquidityTransfer[] = [];
  const kpis: { label: string; value: string }[] = [];
  let sumZec = 0;

  if (hi >= 0) {
    for (let r = hi + 1; r < rows.length; r++) {
      const line = rows[r]!;
      const project = stripCell(line[0]);
      const kLabel = stripCell(line[7]);
      const kVal = stripCell(line[8]);
      if (!project && kLabel && kVal) kpis.push({ label: kLabel, value: kVal });

      if (!project) continue;
      const zec = parseZecAmount(stripCell(line[3] ?? ""));
      if (zec != null) sumZec += zec;
      transfers.push({
        project,
        amountUsd: parseMoneyToNumber(stripCell(line[1] ?? "")),
        transferred: stripCell(line[2]),
        zecTransferred: zec,
        zecUsd: parseZecAmount(stripCell(line[5] ?? "")),
      });
    }
  }

  return {
    transfers,
    kpis,
    sumZecTransferred: Math.round(sumZec * 100) / 100,
  };
}

// —— 2026 Discretionary budget ——
export type DiscBudgetLine = {
  date: string;
  recipient: string;
  paidAs: string;
  description: string;
  zec: number | null;
  zecUsd: number | null;
  usd: number | null;
};

export function parseDiscBudgetCsv(csv: string): {
  annualBudgetUsd: number | null;
  annualBudgetZec: number | null;
  spentUsd: number | null;
  spentZec: number | null;
  remainingUsd: number | null;
  remainingZec: number | null;
  lines: DiscBudgetLine[];
} {
  const rows = parseCsv(csv);
  let annualBudgetUsd: number | null = null;
  let annualBudgetZec: number | null = null;
  let spentUsd: number | null = null;
  let spentZec: number | null = null;
  let remainingUsd: number | null = null;
  let remainingZec: number | null = null;

  for (let i = 0; i < Math.min(rows.length, 12); i++) {
    const a = stripCell(rows[i]![0]);
    const b = stripCell(rows[i]![1]);
    const c = stripCell(rows[i]![2]);
    if (a.toLowerCase().includes("annual budget")) {
      annualBudgetUsd = parseMoneyToNumber(b);
      annualBudgetZec = parseZecAmount(c);
    }
    if (a.toLowerCase().includes("spent to date")) {
      spentUsd = parseMoneyToNumber(b);
      spentZec = parseZecAmount(c);
    }
    if (a.toLowerCase().includes("budget remaining")) {
      remainingUsd = parseMoneyToNumber(b);
      remainingZec = parseZecAmount(c);
    }
  }

  const hi = findHeaderRow(
    rows,
    (c) =>
      normHeader(c[0] ?? "").includes("date") &&
      normHeader(c[0] ?? "").includes("reimbursed")
  );

  const lines: DiscBudgetLine[] = [];
  if (hi >= 0) {
    for (let r = hi + 1; r < rows.length; r++) {
      const line = rows[r]!;
      const date = stripCell(line[0]);
      if (!date || !/\d/.test(date)) continue;
      lines.push({
        date,
        recipient: stripCell(line[1]),
        paidAs: stripCell(line[2]),
        description: stripCell(line[3]),
        zec: parseZecAmount(stripCell(line[4] ?? "")),
        zecUsd: parseMoneyToNumber(stripCell(line[5] ?? "")),
        usd: parseMoneyToNumber(stripCell(line[6] ?? "")),
      });
    }
  }

  return {
    annualBudgetUsd,
    annualBudgetZec,
    spentUsd,
    spentZec,
    remainingUsd,
    remainingZec,
    lines,
  };
}

// —— Stipend ——
export type StipendRow = {
  date: string;
  recipient: string;
  forMonth: string;
  usdAmount: number | null;
  zecUsd: number | null;
  zec: number | null;
};

export function parseStipendCsv(csv: string): {
  rows: StipendRow[];
  byRecipient: { name: string; usd: number; count: number }[];
  totals: { lines: number; sumUsd: number; sumZec: number };
} {
  const rows = parseCsv(csv);
  const hi = findHeaderRow(
    rows,
    (c) =>
      normHeader(c[0] ?? "").includes("date") &&
      normHeader(c[1] ?? "") === "recipient"
  );
  if (hi < 0)
    return { rows: [], byRecipient: [], totals: { lines: 0, sumUsd: 0, sumZec: 0 } };

  const out: StipendRow[] = [];
  const byRec: Record<string, { usd: number; n: number }> = {};
  let sumUsd = 0;
  let sumZec = 0;

  for (let r = hi + 1; r < rows.length; r++) {
    const line = rows[r]!;
    const date = stripCell(line[0]);
    if (!date || !/\d/.test(date)) continue;
    const recipient = stripCell(line[1]);
    const usd = parseMoneyToNumber(stripCell(line[3] ?? ""));
    const zec = parseZecAmount(stripCell(line[5] ?? ""));
    if (usd != null) sumUsd += usd;
    if (zec != null) sumZec += zec;
    if (recipient) {
      if (!byRec[recipient]) byRec[recipient] = { usd: 0, n: 0 };
      byRec[recipient]!.n += 1;
      if (usd != null) byRec[recipient]!.usd += usd;
    }
    out.push({
      date,
      recipient,
      forMonth: stripCell(line[2]),
      usdAmount: usd,
      zecUsd: parseMoneyToNumber(stripCell(line[4] ?? "")),
      zec,
    });
  }

  const byRecipient = Object.entries(byRec)
    .map(([name, v]) => ({
      name,
      usd: Math.round(v.usd),
      count: v.n,
    }))
    .sort((a, b) => b.usd - a.usd)
    .slice(0, 15);

  return {
    rows: out,
    byRecipient,
    totals: {
      lines: out.length,
      sumUsd: Math.round(sumUsd),
      sumZec: Math.round(sumZec * 100) / 100,
    },
  };
}

// —— Funds distribution ——
export type DistributionRow = {
  recipient: string;
  paidOutUsd: number | null;
  futureUsd: number | null;
  sideLabel: string;
  sideUsd: number | null;
};

export function parseFundsDistributionCsv(csv: string): {
  rows: DistributionRow[];
  topRecipients: { name: string; paidUsd: number }[];
  bySideClassification: { name: string; usd: number }[];
} {
  const rows = parseCsv(csv);
  const hi = findHeaderRow(
    rows,
    (c) =>
      normHeader(c[0] ?? "").includes("recipient") &&
      normHeader(c[0] ?? "").includes("classification")
  );
  if (hi < 0) return { rows: [], topRecipients: [], bySideClassification: [] };

  const out: DistributionRow[] = [];
  const top: { name: string; paidUsd: number }[] = [];
  const sideMap: Record<string, number> = {};

  for (let r = hi + 1; r < rows.length; r++) {
    const line = rows[r]!;
    const recipient = stripCell(line[0]);
    if (!recipient || recipient.toLowerCase() === "recipient or classification")
      continue;

    const paid = parseMoneyToNumber(stripCell(line[1] ?? ""));
    const future = parseMoneyToNumber(stripCell(line[2] ?? ""));
    const sideLabel = stripCell(line[14] ?? "");
    const sideUsd = parseMoneyToNumber(stripCell(line[15] ?? ""));

    if (
      sideLabel.toLowerCase() === "classification" ||
      sideLabel.toLowerCase() === "total"
    )
      continue;

    out.push({
      recipient,
      paidOutUsd: paid,
      futureUsd: future,
      sideLabel,
      sideUsd,
    });

    if (paid != null && paid > 0)
      top.push({ name: recipient, paidUsd: paid });

    if (
      sideLabel &&
      sideLabel.toLowerCase() !== "total" &&
      sideUsd != null &&
      sideUsd > 0
    ) {
      sideMap[sideLabel] = (sideMap[sideLabel] ?? 0) + sideUsd;
    }
  }

  top.sort((a, b) => b.paidUsd - a.paidUsd);

  const bySideClassification = Object.entries(sideMap)
    .map(([name, usd]) => ({ name, usd: Math.round(usd) }))
    .sort((a, b) => b.usd - a.usd);

  return {
    rows: out,
    topRecipients: top.slice(0, 15),
    bySideClassification,
  };
}

// —— ZCG all grants tracking ——
export function parseZcgTrackingCsv(csv: string): {
  byStatus: { name: string; count: number }[];
  totalRows: number;
} {
  const rows = parseCsv(csv);
  const hi = findHeaderRow(
    rows,
    (c) =>
      normHeader(c[5] ?? "").includes("grant") &&
      normHeader(c[5] ?? "").includes("status")
  );
  if (hi < 0) return { byStatus: [], totalRows: 0 };

  const iStatus = 5;
  const iTitle = 1;

  const st: Record<string, number> = {};
  let n = 0;
  for (let r = hi + 1; r < rows.length; r++) {
    const title = stripCell(rows[r]![iTitle]);
    if (!title) continue;
    n += 1;
    const status = stripCell(rows[r]![iStatus] ?? "") || "Unknown";
    st[status] = (st[status] ?? 0) + 1;
  }

  return {
    byStatus: Object.entries(st)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    totalRows: n,
  };
}

// —— Coinholder all grants tracking ——
export function parseCoinholderTrackingCsv(csv: string): {
  byDecision: { name: string; count: number }[];
  totalRows: number;
} {
  const rows = parseCsv(csv);
  const hi = findHeaderRow(
    rows,
    (c) =>
      normHeader(c[0] ?? "").includes("date") &&
      normHeader(c[0] ?? "").includes("submitted")
  );
  if (hi < 0) return { byDecision: [], totalRows: 0 };

  const col = 6;
  const iTitle = 1;

  const st: Record<string, number> = {};
  let n = 0;
  for (let r = hi + 1; r < rows.length; r++) {
    const title = stripCell(rows[r]![iTitle]);
    if (!title) continue;
    n += 1;
    const d = stripCell(rows[r]![col] ?? "") || "Unknown";
    st[d] = (st[d] ?? 0) + 1;
  }

  return {
    byDecision: Object.entries(st)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    totalRows: n,
  };
}

// —— Inputs (model reference + lockbox scenarios) ——
export type InputsSnapshot = {
  metrics: Record<string, string>;
  lockboxSecondFundZec: string | null;
  lockboxThirdFundZec: string | null;
  scenarioUsd: { label: string; usd: number; group: string }[];
};

export function parseInputsCsv(csv: string): InputsSnapshot {
  const rows = parseCsv(csv);
  const metrics: Record<string, string> = {};
  for (const r of rows) {
    const k = stripCell(r[0]);
    const zcg = stripCell(r[1]);
    if (k && zcg) metrics[k] = zcg;
  }

  let lockboxSecondFundZec: string | null = null;
  let lockboxThirdFundZec: string | null = null;
  const scenarioUsd: { label: string; usd: number; group: string }[] = [];

  let scenarioGroup = "Lockbox scenarios";
  for (let i = 0; i < rows.length; i++) {
    const a = stripCell(rows[i]![0]);
    if (
      a.includes("Total amount that accrued to the Lockbox") &&
      a.includes("2nd Dev Fund")
    ) {
      lockboxSecondFundZec = stripCell(rows[i]![1]) || null;
      scenarioGroup = "ZIP 1015 (2nd Dev Fund) — USD value of accrued ZEC";
    }
    if (
      a.includes("Total amount that will accrue") &&
      a.includes("3rd Dev Fund")
    ) {
      lockboxThirdFundZec = stripCell(rows[i]![1]) || null;
      scenarioGroup = "ZIP 1016 (3rd Dev Fund) — USD value of accruing ZEC";
    }
    if (
      a.includes("USD value at") &&
      (a.includes("current price") ||
        a.includes("2x current") ||
        a.includes("3x current"))
    ) {
      const short = a.replace(/^Projected\s*/i, "").trim();
      const v = parseMoneyToNumber(stripCell(rows[i]![1] ?? ""));
      if (v != null)
        scenarioUsd.push({
          label: short.slice(0, 80),
          usd: Math.round(v),
          group: scenarioGroup,
        });
    }
  }

  return {
    metrics,
    lockboxSecondFundZec,
    lockboxThirdFundZec,
    scenarioUsd,
  };
}
