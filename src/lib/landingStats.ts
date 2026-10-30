import type { Grant } from "@/data/grantTypes";
import { parseMoneyToNumber, type ParsedPublicDashboard } from "@/lib/zcgPublicSpreadsheet";

/** Homepage counts cover both GitHub programs; financial figures cover ZCG only. */
export function landingStats(grants: Grant[], dashboard?: ParsedPublicDashboard) {
  const metric = (label: string) => parseMoneyToNumber(dashboard?.metrics[label] ?? "");
  return {
    applications: grants.length,
    approvedOrActive: grants.filter((g) => g.status === "ACTIVE" || g.status === "APPROVED").length,
    paidMilestonesUsd: metric("USD value of grant milestones paid out so far:"),
    treasuryUsd: metric("USD value of current holdings:"),
  };
}

export function recentApplications(grants: Grant[]) {
  return [...grants]
    .sort((a, b) => b.submittedDate.localeCompare(a.submittedDate))
    .slice(0, 4);
}
