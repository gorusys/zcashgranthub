import { describe, expect, it } from "vitest";
import type { Grant } from "@/data/grantTypes";
import { filterGrants, grantsRss, publicRetroRounds, toPublicGrant } from "@/lib/publicApi";

const g = (over: Partial<Grant>): Grant =>
  ({
    id: "zcg-1",
    program: "zcg",
    issueNumber: 1,
    title: "Wallet <Beta> & more",
    status: "ACTIVE",
    category: "Wallets",
    applicant: "alice",
    amount: 1000,
    amountPaid: 250,
    totalMilestones: 4,
    milestonesCompleted: 1,
    labels: [],
    submittedDate: "2026-01-01T00:00:00Z",
    lastUpdated: "2026-10-01T00:00:00Z",
    summary: "A shielded wallet",
    githubLink: "https://github.com/x/y/issues/1",
    ...over,
  }) as Grant;

describe("public API", () => {
  const grants = [
    g({}),
    g({ id: "coinholder-2", program: "coinholder", status: "REJECTED", category: "Media", title: "Videos", summary: "" , lastUpdated: "2026-05-01T00:00:00Z" }),
  ];

  it("filters by program, status list, category, text and update date", () => {
    expect(filterGrants(grants, { program: "coinholder" }).map((x) => x.id)).toEqual(["coinholder-2"]);
    expect(filterGrants(grants, { status: "active,rejected" })).toHaveLength(2);
    expect(filterGrants(grants, { category: "wallets" }).map((x) => x.id)).toEqual(["zcg-1"]);
    expect(filterGrants(grants, { q: "shielded" }).map((x) => x.id)).toEqual(["zcg-1"]);
    expect(filterGrants(grants, { updatedSince: "2026-09-01" }).map((x) => x.id)).toEqual(["zcg-1"]);
    expect(filterGrants(grants, { updatedSince: "not a date" })).toHaveLength(2);
  });

  it("maps to the stable public shape without comments or bodies", () => {
    const p = toPublicGrant(grants[0]);
    expect(p).toMatchObject({ id: "zcg-1", amountUsd: 1000, amountPaidUsd: 250, milestones: { total: 4, paid: 1 } });
    expect(p.url).toMatch(/\/grants\/zcg-1$/);
    expect(Object.keys(p)).not.toContain("comments");
  });

  it("escapes XML in the RSS feed and orders by last update", () => {
    const rss = grantsRss(grants);
    expect(rss).toContain("Wallet &lt;Beta&gt; &amp; more");
    expect(rss.indexOf("zcg-1@")).toBeLessThan(rss.indexOf("coinholder-2@"));
    expect(rss).not.toContain("<Beta>");
  });

  it("returns every round with phase and outcomes", () => {
    const rounds = publicRetroRounds([], Date.parse("2026-10-30T08:00:00Z"));
    const q4 = rounds.find((r) => r.id === "q4-2026")!;
    expect(q4.phase).toBe("submissions");
    expect(q4.nextMilestone?.label).toBe("Submission deadline");
    expect(rounds.find((r) => r.id === "q2-2026")).toMatchObject({ phase: "postponed", outcomes: undefined });
  });
});
