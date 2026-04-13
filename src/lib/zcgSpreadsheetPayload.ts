import type { ParsedPublicDashboard } from "@/lib/zcgPublicSpreadsheet";
import type { InputsSnapshot } from "@/lib/zcgSheetParsers";
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

export type PublicSpreadsheetPayload = {
  sourceUrl: string;
  fetchedAt: string;
  zcg: ParsedPublicDashboard;
  coinholder: ParsedPublicDashboard;
  inputs: InputsSnapshot;
  zcgGrants: ReturnType<typeof parseZcgGrantsCsv>;
  icPayouts: ReturnType<typeof parseIcPayoutsCsv>;
  coinholderGrants: ReturnType<typeof parseCoinholderGrantsCsv>;
  liquidity: ReturnType<typeof parseLiquidityCsv>;
  discBudget2026: ReturnType<typeof parseDiscBudgetCsv>;
  stipend: ReturnType<typeof parseStipendCsv>;
  zcgFundsDistribution: ReturnType<typeof parseFundsDistributionCsv>;
  coinholderFundsDistribution: ReturnType<typeof parseFundsDistributionCsv>;
  zcgAllGrantsTracking: ReturnType<typeof parseZcgTrackingCsv>;
  coinholderAllGrantsTracking: ReturnType<typeof parseCoinholderTrackingCsv>;
};
