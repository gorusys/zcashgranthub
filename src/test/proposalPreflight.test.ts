import { describe, expect, it } from "vitest";
import type { Grant } from "@/data/grantTypes";
import {
  benchmarkCheck,
  costBenchmark,
  findSimilarGrants,
  preflightZcg,
} from "@/lib/proposalPreflight";

const today = new Date("2026-10-30T00:00:00Z");

const milestone = (amount: string, date: string) => ({
  amount,
  date,
  stories: ["As a user…"],
  deliverables: ["Release v1"],
  criteria: "Tagged release on GitHub",
});

const good: Parameters<typeof preflightZcg>[0] = {
  formData: {
    title: "Shielded payments plugin for WooCommerce",
    summary: "A WooCommerce plugin that accepts shielded ZEC with ZIP-321 payment requests and viewing-key verification.",
    amount: "30000",
    hardware: "0",
    services: "2000",
    serviceJustification: "Hosting and CI for 12 months",
    compensation: "28000",
    compensationJustification: "350 hours at $80/h",
    successMetrics: "50 merchants live within 6 months",
    implRisks: "Plugin API churn; mitigated by pinning versions",
    leadBg: "Maintainer of two payment plugins",
    startupAmount: "0",
    prevFunding: "no",
    otherFunding: "no",
  },
  milestones: [milestone("15000", "2026-12-15"), milestone("15000", "2027-02-15")],
  teamMembers: [],
};

const ids = (input: Parameters<typeof preflightZcg>[0]) =>
  preflightZcg(input, today)
    .filter((c) => c.level !== "info")
    .map((c) => c.id);

describe("preflightZcg", () => {
  it("passes a consistent application", () => {
    expect(ids(good)).toEqual([]);
  });

  it("flags budget, requested amount and milestone sum mismatches", () => {
    const r = ids({
      ...good,
      formData: { ...good.formData, amount: "35000" },
      milestones: [milestone("10000", "2026-12-15")],
    });
    expect(r).toContain("budget-requested");
    expect(r).toContain("ms-sum");
  });

  it("counts the startup payment toward the milestone total", () => {
    const r = ids({
      ...good,
      formData: { ...good.formData, startupAmount: "5000", startupJustification: "Hardware upfront" },
      milestones: [milestone("10000", "2026-12-15"), milestone("15000", "2027-02-15")],
    });
    expect(r).not.toContain("ms-sum");
  });

  it("flags undated, past, out-of-order and empty milestones", () => {
    const r = ids({
      ...good,
      milestones: [
        milestone("10000", "2026-12-15"),
        { ...milestone("10000", "2026-01-01"), deliverables: [""], criteria: "" },
        milestone("10000", ""),
      ],
    });
    expect(r).toEqual(expect.arrayContaining(["ms-2-past", "ms-2-order", "ms-2-deliv", "ms-2-criteria", "ms-3-date"]));
  });

  it("asks for measurable KPIs and finer milestones on large requests", () => {
    const r = ids({
      ...good,
      formData: { ...good.formData, amount: "90000", compensation: "88000", successMetrics: "Lots of adoption" },
      milestones: [milestone("80000", "2026-12-15"), milestone("10000", "2027-01-15")],
    });
    expect(r).toEqual(expect.arrayContaining(["kpi-numbers", "ms-granularity"]));
    expect(preflightZcg(good, today).some((c) => c.id === "kyc")).toBe(false);
  });

  it("requires disclosure details when other funding is declared", () => {
    expect(ids({ ...good, formData: { ...good.formData, otherFunding: "yes" } })).toContain("other-funding");
  });
});

describe("findSimilarGrants", () => {
  const g = (id: string, title: string, summary = "") => ({ id, title, summary }) as Grant;
  const grants = [
    g("zcg-1", "WooCommerce shielded ZEC payment plugin", "Accept ZEC in WooCommerce stores"),
    g("zcg-2", "Zcash podcast season 3", "Interviews"),
    g("zcg-3", "BTCPay Server Zcash plugin", "Merchant payments with shielded ZEC"),
  ];

  it("ranks keyword overlap, title words first", () => {
    const r = findSimilarGrants({ title: good.formData.title, summary: good.formData.summary }, grants);
    expect(r.map((x) => x.grant.id)).toEqual(["zcg-1", "zcg-3"]);
  });

  it("returns nothing for an empty draft", () => {
    expect(findSimilarGrants({ title: "", summary: "" }, grants)).toEqual([]);
  });
});

describe("cost benchmarks", () => {
  const now = new Date("2026-10-30T00:00:00Z");
  const mk = (amount: number, status: string, category = "Wallets", date = "2026-01-01T00:00:00Z", program = "zcg") =>
    ({ amount, status, category, submittedDate: date, program }) as unknown as Grant;

  it("needs at least five funded grants in the category", () => {
    expect(costBenchmark([mk(1000, "APPROVED")], "Wallets", now)).toBeNull();
  });

  it("computes medians for funded and declined, ignoring other programs, categories and old grants", () => {
    const grants = [
      ...[10, 20, 30, 40, 50].map((k) => mk(k * 1000, "COMPLETED")),
      mk(90000, "REJECTED"),
      mk(70000, "REJECTED"),
      mk(999999, "APPROVED", "Media"),
      mk(999999, "APPROVED", "Wallets", "2020-01-01T00:00:00Z"),
      mk(999999, "APPROVED", "Wallets", "2026-01-01T00:00:00Z", "coinholder"),
    ];
    const b = costBenchmark(grants, "Wallets", now)!;
    expect(b.funded).toEqual({ n: 5, median: 30000 });
    expect(b.declined).toEqual({ n: 2, median: 80000 });
    expect(benchmarkCheck(b, 100000)!.level).toBe("warning");
    expect(benchmarkCheck(b, 25000)!.level).toBe("info");
    expect(benchmarkCheck(null, 25000)).toBeNull();
  });
});
