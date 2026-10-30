import { describe, expect, it } from "vitest";
import type { Grant } from "@/data/grantTypes";
import { landingStats, recentApplications } from "@/lib/landingStats";
import { parsePublicDashboardCsv } from "@/lib/zcgPublicSpreadsheet";

const grant = (status: Grant["status"], submittedDate = "2026-10-01", program: Grant["program"] = "zcg") =>
  ({ status, submittedDate, program, amountPaid: 0 }) as Grant;

describe("homepage statistics", () => {
  it("uses grant milestone value, rather than cash outflow, for ZCG payouts", () => {
    const dashboard = parsePublicDashboardCsv([
      'Total USD outflow:,"$ 1,064,144"',
      'USD value of grant milestones paid out so far:,"$ 21,919,943"',
      'USD value of current holdings:,"$ 123,325,958"',
    ].join("\n"));
    expect(landingStats([], dashboard)).toMatchObject({
      paidMilestonesUsd: 21_919_943,
      treasuryUsd: 123_325_958,
    });
  });

  it("keeps unavailable financial data distinct from a reported zero", () => {
    expect(landingStats([])).toMatchObject({ paidMilestonesUsd: null, treasuryUsd: null });
    const dashboard = parsePublicDashboardCsv('USD value of current holdings:,$0');
    expect(landingStats([], dashboard).treasuryUsd).toBe(0);
  });

  it("counts applications across programs and only approved or active statuses", () => {
    const grants = [grant("ACTIVE"), grant("APPROVED", undefined, "coinholder"), grant("COMPLETED"), grant("REJECTED")];
    expect(landingStats(grants)).toMatchObject({ applications: 4, approvedOrActive: 2 });
  });

  it("shows the newest applications across programs and statuses without mutating the source", () => {
    const grants = [grant("ACTIVE", "2026-01-01"), grant("REJECTED", "2026-10-30", "coinholder"), grant("COMPLETED", "2026-10-29"), grant("APPROVED", "2026-09-01"), grant("COMMITTEE_REVIEW", "2026-10-28")];
    const result = recentApplications(grants);
    expect(result.map((g) => g.submittedDate)).toEqual(["2026-10-30", "2026-10-29", "2026-10-28", "2026-09-01"]);
    expect(grants[0].submittedDate).toBe("2026-01-01");
  });
});
