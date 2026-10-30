import { describe, expect, it } from "vitest";
import {
  blockSplit,
  blockSubsidyZat,
  dailyFlows,
  estimateHeightAt,
  estimateTimeOfHeight,
  NU7_HEIGHT,
  simulateRunway,
  THIRD_HALVING_HEIGHT,
} from "@/lib/fundingStreams";

describe("issuance (ZIP 218 / ZIP 214 rev. 3)", () => {
  it("moves the third halving and stream end to A + 3(4,406,400 − A)", () => {
    expect(THIRD_HALVING_HEIGHT).toBe(6_132_390);
  });

  it("divides the subsidy by three at NU7, with ZIP 218's rounding", () => {
    expect(blockSubsidyZat(NU7_HEIGHT - 1)).toBe(156_250_000);
    expect(blockSubsidyZat(NU7_HEIGHT)).toBe(52_083_333);
    expect(blockSubsidyZat(THIRD_HALVING_HEIGHT)).toBe(26_041_666);
    expect(blockSubsidyZat(THIRD_HALVING_HEIGHT + 5_040_000)).toBe(13_020_833);
  });

  it("splits 80/8/12 with the per-block stream values ZIP 218 lists", () => {
    expect(blockSplit(NU7_HEIGHT - 1)).toEqual({
      subsidyZat: 156_250_000,
      zcgZat: 12_500_000,
      coinholderZat: 18_750_000,
      minersZat: 125_000_000,
    });
    const post = blockSplit(NU7_HEIGHT);
    expect(post.zcgZat).toBe(4_166_666);
    expect(post.coinholderZat).toBe(6_249_999);
    expect(post.minersZat).toBe(41_666_668);
  });

  it("ends both streams at the third halving", () => {
    const s = blockSplit(THIRD_HALVING_HEIGHT);
    expect(s.zcgZat).toBe(0);
    expect(s.coinholderZat).toBe(0);
    expect(s.minersZat).toBe(s.subsidyZat);
  });

  it("keeps daily issuance at about 1,800 ZEC across NU7", () => {
    expect(dailyFlows(NU7_HEIGHT - 1).issuedZec).toBeCloseTo(1800, 6);
    expect(dailyFlows(NU7_HEIGHT).issuedZec).toBeCloseTo(1800, 2);
    expect(dailyFlows(NU7_HEIGHT).zcgZec).toBeCloseTo(144, 1);
    expect(dailyFlows(NU7_HEIGHT).coinholderZec).toBeCloseTo(216, 1);
  });
});

describe("height ↔ time estimates", () => {
  const ref = { height: 3_535_681, time: Date.parse("2026-10-30T08:50:11Z") };

  it("projects NU7 about 6.7 days out at 75 s blocks", () => {
    const t = estimateTimeOfHeight(NU7_HEIGHT, ref);
    expect((t - ref.time) / 86_400_000).toBeCloseTo((7_724 * 75) / 86_400, 6);
  });

  it("switches to 25 s spacing after NU7, and round-trips", () => {
    const nu7 = estimateTimeOfHeight(NU7_HEIGHT, ref);
    expect(estimateTimeOfHeight(NU7_HEIGHT + 3456, ref) - nu7).toBe(86_400_000);
    expect(estimateHeightAt(nu7 + 86_400_000, ref)).toBe(NU7_HEIGHT + 3456);
    expect(estimateHeightAt(ref.time + 75_000 * 10, ref)).toBe(ref.height + 10);
  });

  it("puts the post-NU7 third halving in late 2028", () => {
    const t = new Date(estimateTimeOfHeight(THIRD_HALVING_HEIGHT, ref));
    expect(t.getUTCFullYear()).toBe(2028);
  });
});

describe("simulateRunway", () => {
  const now = Date.parse("2026-11-01T00:00:00Z");
  const base = { treasuryZec: 1000, zecUsd: 100, now };

  it("depletes at the spend rate when there is no stream", () => {
    // $100/day at $100/ZEC = 1 ZEC/day → 1000 days.
    const r = simulateRunway({ ...base, quarterlySpendUsd: 100 * (365 / 4), streamZecPerDay: 0, streamEndsAt: now });
    expect(Math.round((r.depletedAt! - now) / 86_400_000)).toBe(1000);
  });

  it("lasts past the horizon while inflow exceeds spending, and ends after the stream stops", () => {
    const forever = simulateRunway({ ...base, quarterlySpendUsd: 100 * (365 / 4), streamZecPerDay: 2, streamEndsAt: Infinity });
    expect(forever.depletedAt).toBeNull();
    const ends = simulateRunway({ ...base, quarterlySpendUsd: 100 * (365 / 4), streamZecPerDay: 2, streamEndsAt: now + 100 * 86_400_000 });
    // +1 ZEC/day net for 100 days → 1100 ZEC, then −1/day → 1100 more days.
    expect(Math.round((ends.depletedAt! - now) / 86_400_000)).toBe(1200);
  });
});
