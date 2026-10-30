import { describe, expect, it } from "vitest";
import { activityLevel, sinceDaysAgo, summarizeCommits, summarizeReleases, type GhRelease } from "@/lib/repoStats";

const rel = (tag: string, at: string | null, body = "", extra: Partial<GhRelease> = {}): GhRelease => ({
  tag_name: tag, name: tag, body, draft: false, prerelease: false, published_at: at, html_url: `https://x/${tag}`, ...extra,
});

describe("repo stats helpers", () => {
  it("picks the latest stable release and the newest one mentioning NU7", () => {
    const r = summarizeReleases([
      rel("v7.1.0-rc1", "2026-10-28T00:00:00Z", "", { prerelease: true }),
      rel("v7.0.0", "2026-10-22T00:00:00Z", "Adds **NU7** mainnet activation"),
      rel("v6.9.0", "2026-09-01T00:00:00Z", "Network Upgrade 7 testnet"),
      rel("draft", "2026-10-29T00:00:00Z", "NU7", { draft: true }),
      rel("unpublished", null),
    ]);
    expect(r.latestRelease?.tag).toBe("v7.0.0");
    expect(r.nu7Release?.tag).toBe("v7.0.0");
    expect(summarizeReleases([rel("v1", "2026-01-01T00:00:00Z", "NU6.1 support")]).nu7Release).toBeNull();
  });

  it("counts distinct human authors and flags a capped sample", () => {
    const c = (login: string | null, email = "") => ({ author: login ? { login } : null, commit: { author: { email } } });
    const r = summarizeCommits([c("alice"), c("alice"), c(null, "bob@x"), c("dependabot[bot]"), c("github-actions[bot]")]);
    expect(r).toEqual({ activeContributors90d: 2, commits90d: 5, commitsCapped: false });
    expect(summarizeCommits(Array.from({ length: 100 }, () => c("a"))).commitsCapped).toBe(true);
  });

  it("rounds 'since' to the day and buckets activity", () => {
    const now = Date.parse("2026-10-30T15:42:00Z");
    expect(sinceDaysAgo(90, now)).toBe("2026-08-01T00:00:00Z");
    expect(activityLevel("2026-10-01T00:00:00Z", now)).toBe("active");
    expect(activityLevel("2026-03-01T00:00:00Z", now)).toBe("quiet");
    expect(activityLevel("2024-01-01T00:00:00Z", now)).toBe("dormant");
    expect(activityLevel(null, now)).toBe("unknown");
  });
});
