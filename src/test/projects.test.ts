import { describe, expect, it } from "vitest";
import type { Grant } from "@/data/grantTypes";
import { buildProjects, isFunded, paidUsd } from "@/lib/projects";

const g = (over: Partial<Grant>): Grant =>
  ({
    id: "zcg-1", program: "zcg", status: "ACTIVE", title: "T", category: "Wallets", amount: 1000, amountPaid: 250,
    githubUsername: "alice", applicantAvatar: "a.png", submittedDate: "2026-01-01T00:00:00Z", labels: [],
    summary: "", description: "", solution: "", solutionFormat: "", technicalApproach: "", dependencies: "", upstreamMerge: "",
    teamLead: { name: "", role: "", background: "", responsibilities: "" }, teamMembers: [], documents: [], milestones: [],
    ...over,
  }) as Grant;

describe("project directory", () => {
  it("counts funded ZCG statuses and coinholder approvals; paid follows milestones or disbursement", () => {
    expect(isFunded(g({ status: "REJECTED" }))).toBe(false);
    expect(isFunded(g({ program: "coinholder", status: "COMPLETED", labels: ["Approved by Coinholders"] }))).toBe(true);
    expect(isFunded(g({ program: "coinholder", status: "APPROVED", labels: ["Approved by Coinholders", "Vetoed by Key Holder"] }))).toBe(false);
    expect(paidUsd(g({}))).toBe(250);
    expect(paidUsd(g({ program: "coinholder", amount: 5000, labels: ["Funds Disbursed by Keyholders"] }))).toBe(5000);
    expect(paidUsd(g({ program: "coinholder", amount: 5000, labels: ["Approved by Coinholders"] }))).toBe(0);
  });

  it("groups by applicant (case-insensitive), totals, repos and core-repo links", () => {
    const { projects, core } = buildProjects([
      g({ id: "zcg-1", summary: "Work in https://github.com/zingolabs/zaino", submittedDate: "2026-01-01T00:00:00Z" }),
      g({ id: "zcg-2", githubUsername: "Alice", category: "Infrastructure", amount: 3000, amountPaid: 0, submittedDate: "2026-06-01T00:00:00Z", description: "https://github.com/alice/tool" }),
      g({ id: "zcg-3", githubUsername: "bob", status: "REJECTED", summary: "https://github.com/zingolabs/zaino" }),
      g({ id: "coinholder-4", program: "coinholder", githubUsername: "carol", amount: 9000, labels: ["Approved by Coinholders"] }),
    ]);
    expect(projects.map((p) => [p.owner, p.fundedUsd, p.paidUsd, p.grants.length])).toEqual([
      ["carol", 9000, 0, 1],
      ["alice", 4000, 250, 2],
    ]);
    const alice = projects[1];
    expect(alice.grants[0].id).toBe("zcg-2");
    expect(alice.categories).toEqual(["Wallets", "Infrastructure"]);
    expect(alice.repos).toEqual(["zingolabs/zaino", "alice/tool"]);
    expect(core.find((c) => c.repo === "zingolabs/zaino")!.grantIds).toEqual(["zcg-1"]);
  });
});
