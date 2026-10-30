import { describe, expect, it } from "vitest";
import { fromGithub, fromZechub, githubSearchQuery } from "@/lib/opportunities";

describe("opportunities", () => {
  it("keeps only open, approved, public mainnet ZecHub bounties", () => {
    const base = { title: " Add wallet ", dateCreated: "2026-10-27T00:00:00Z", bountyAmount: 0.04, difficulty: "EASY", categoryId: "Writing and Research", description: "## Add **Zillions**\nto the page" };
    const r = fromZechub([
      { ...base, id: "a", status: "TO_DO", isApproved: true, chain: "MAIN" },
      { ...base, id: "b", status: "IN_PROGRESS" },
      { ...base, id: "c", status: "TO_DO", isPrivate: true },
      { ...base, id: "d", status: "TO_DO", chain: "TEST" },
      { ...base, id: "e", status: "TO_DO", isApproved: false },
    ]);
    expect(r.map((o) => o.id)).toEqual(["zechub-a"]);
    expect(r[0]).toMatchObject({ title: "Add wallet", amountZec: 0.04, difficulty: "easy", summary: "Add Zillions to the page" });
    expect(r[0].url).toBe("https://bounties.zechub.wiki/bounties/a");
  });

  it("drops PRs and assigned issues and marks good first issues easy", () => {
    const base = { title: "Fix docs", html_url: "https://github.com/zcash/zips/issues/1", repository_url: "https://api.github.com/repos/zcash/zips", created_at: "2026-01-01T00:00:00Z" };
    const r = fromGithub([
      { ...base, id: 1, labels: [{ name: "good first issue" }] },
      { ...base, id: 2, labels: ["help wanted"] },
      { ...base, id: 3, labels: [], pull_request: {} },
      { ...base, id: 4, labels: [], assignee: { login: "x" } },
    ]);
    expect(r.map((o) => [o.id, o.context, o.difficulty])).toEqual([
      ["github-1", "zcash/zips", "easy"],
      ["github-2", "zcash/zips", null],
    ]);
  });

  it("builds one search query across orgs and labels", () => {
    expect(githubSearchQuery()).toBe(
      'is:issue is:open label:"good first issue","help wanted","bounty" org:zcash org:ZcashFoundation org:zingolabs org:zodl-inc org:ZecHub'
    );
  });
});
