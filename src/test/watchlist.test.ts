import { describe, expect, it } from "vitest";
import type { Grant } from "@/data/grantTypes";
import { computeUpdates, entryFor, markAllSeen, readWatchlist, writeWatchlist } from "@/lib/watchlist";

const g = (id: string, status: Grant["status"], lastUpdated: string, githubUsername = "someone") =>
  ({ id, title: `Grant ${id}`, status, lastUpdated, githubUsername }) as Grant;

describe("watchlist", () => {
  const seenAt = "2026-10-01T00:00:00Z";
  const watch = {
    "zcg-1": entryFor(g("zcg-1", "COMMITTEE_REVIEW", seenAt)),
    "zcg-2": entryFor(g("zcg-2", "ACTIVE", seenAt)),
    "zcg-3": entryFor(g("zcg-3", "ACTIVE", seenAt)),
  };

  it("reports status changes, new activity, and the visitor's own unseen applications", () => {
    const grants = [
      g("zcg-1", "APPROVED", "2026-10-20T00:00:00Z"),
      g("zcg-2", "ACTIVE", "2026-10-10T00:00:00Z"),
      g("zcg-3", "ACTIVE", seenAt),
      g("zcg-9", "PENDING_REVIEW", "2026-10-25T00:00:00Z", "Alice"),
      g("zcg-8", "PENDING_REVIEW", "2026-10-26T00:00:00Z"),
    ];
    const u = computeUpdates(watch, grants, "alice");
    expect(u.map((x) => [x.grantId, x.kind])).toEqual([
      ["zcg-9", "new"],
      ["zcg-1", "status"],
      ["zcg-2", "activity"],
    ]);
    expect(u[1]).toMatchObject({ from: "COMMITTEE_REVIEW", to: "APPROVED" });
  });

  it("clears updates once marked seen, and starts tracking own grants", () => {
    const grants = [g("zcg-1", "APPROVED", "2026-10-20T00:00:00Z"), g("zcg-9", "PENDING_REVIEW", "2026-10-25T00:00:00Z", "alice")];
    const next = markAllSeen(watch, grants, "alice");
    expect(computeUpdates(next, grants, "alice")).toEqual([]);
    expect(next["zcg-9"].status).toBe("PENDING_REVIEW");
    expect(next["zcg-1"].watchedAt).toBe(watch["zcg-1"].watchedAt);
  });

  it("round-trips through localStorage and tolerates garbage", () => {
    writeWatchlist(watch);
    expect(Object.keys(readWatchlist())).toEqual(["zcg-1", "zcg-2", "zcg-3"]);
    localStorage.setItem("zgh_watchlist_v1", "[not json");
    expect(readWatchlist()).toEqual({});
  });
});
