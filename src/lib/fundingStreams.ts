/**
 * Zcash mainnet issuance and funding streams around NU7.
 *
 * Sources: ZIP 218 (25 s blocks, subsidy ÷ 3, PostNU7HalvingInterval),
 * ZIP 214 rev. 3 / ZIP 1016 (8% ZCG + 12% Coinholder fund until the third
 * halving, moved to A + 3·(4,406,400 − A) by NU7), ZIP 235 (60% of fees
 * removed from circulation), ZIP 237 (NSM reissuance from 8,939,664),
 * ZIP 259 (NU7 deployment, mainnet activation 3,543,405).
 */

export const ZAT = 100_000_000;

export const NU7_HEIGHT = 3_543_405;
/** Third halving under the 75 s schedule. */
export const PRE_NU7_THIRD_HALVING = 4_406_400;
/** NU7PoWTargetSpacingRatio (75 s / 25 s). */
export const NU7_RATIO = 3;
/** Third halving after NU7, also where the ZCG and Coinholder streams end. */
export const THIRD_HALVING_HEIGHT = NU7_HEIGHT + NU7_RATIO * (PRE_NU7_THIRD_HALVING - NU7_HEIGHT);
export const POST_NU7_HALVING_INTERVAL = 5_040_000;
/** ZIP 237: NSM reissuance begins. */
export const NSM_REISSUANCE_HEIGHT = 8_939_664;
/** ZIP 1016 streams (and the ZIP 1015 lockbox stream before them) apply from NU6. */
export const NU6_HEIGHT = 2_726_400;
export const FEE_BURN_SHARE = 0.6;

const MAX_BLOCK_SUBSIDY = 1_250_000_000;
const BLOSSOM_RATIO = 2;

export const PRE_NU7_SPACING_S = 75;
export const POST_NU7_SPACING_S = 25;

export function spacingAt(height: number): number {
  return height >= NU7_HEIGHT ? POST_NU7_SPACING_S : PRE_NU7_SPACING_S;
}

/** Number of halvings that have happened by `height` (mainnet, from the second halving on). */
export function halvingAt(height: number): number {
  if (height < NU6_HEIGHT) throw new RangeError("Heights before the second halving are not modelled");
  if (height < THIRD_HALVING_HEIGHT) return 2;
  return 3 + Math.floor((height - THIRD_HALVING_HEIGHT) / POST_NU7_HALVING_INTERVAL);
}

/** Block subsidy in zatoshi (ZIP 218 formula). */
export function blockSubsidyZat(height: number): number {
  const ratio = BLOSSOM_RATIO * (height >= NU7_HEIGHT ? NU7_RATIO : 1);
  return Math.floor(MAX_BLOCK_SUBSIDY / (ratio * 2 ** halvingAt(height)));
}

export interface BlockSplit {
  subsidyZat: number;
  minersZat: number;
  zcgZat: number;
  coinholderZat: number;
}

/** How one block's subsidy is split (fees excluded). */
export function blockSplit(height: number): BlockSplit {
  const subsidyZat = blockSubsidyZat(height);
  const streamsActive = height >= NU6_HEIGHT && height < THIRD_HALVING_HEIGHT;
  const zcgZat = streamsActive ? Math.floor((subsidyZat * 8) / 100) : 0;
  const coinholderZat = streamsActive ? Math.floor((subsidyZat * 12) / 100) : 0;
  return { subsidyZat, zcgZat, coinholderZat, minersZat: subsidyZat - zcgZat - coinholderZat };
}

export interface DailyFlows {
  blocksPerDay: number;
  issuedZec: number;
  minersZec: number;
  zcgZec: number;
  coinholderZec: number;
}

export function dailyFlows(height: number): DailyFlows {
  const blocksPerDay = 86_400 / spacingAt(height);
  const s = blockSplit(height);
  const z = (zat: number) => (zat * blocksPerDay) / ZAT;
  return {
    blocksPerDay,
    issuedZec: z(s.subsidyZat),
    minersZec: z(s.minersZat),
    zcgZec: z(s.zcgZat),
    coinholderZec: z(s.coinholderZat),
  };
}

export interface ChainRef {
  height: number;
  /** Unix ms of that block. */
  time: number;
}

/** Estimated time of `target`, projecting from a known block at target spacing (75 s, then 25 s after NU7). */
export function estimateTimeOfHeight(target: number, ref: ChainRef): number {
  const lo = Math.min(target, ref.height);
  const hi = Math.max(target, ref.height);
  const pre = Math.max(0, Math.min(hi, NU7_HEIGHT) - lo);
  const post = Math.max(0, hi - Math.max(lo, NU7_HEIGHT));
  const seconds = pre * PRE_NU7_SPACING_S + post * POST_NU7_SPACING_S;
  return ref.time + Math.sign(target - ref.height) * seconds * 1000;
}

/** Estimated chain height at `time`, projecting from a known block. */
export function estimateHeightAt(time: number, ref: ChainRef): number {
  if (time <= ref.time) return ref.height - Math.floor((ref.time - time) / 1000 / spacingAt(ref.height));
  const nu7Time = estimateTimeOfHeight(NU7_HEIGHT, ref);
  if (ref.height >= NU7_HEIGHT || time <= nu7Time) {
    return ref.height + Math.floor((time - ref.time) / 1000 / spacingAt(ref.height));
  }
  return NU7_HEIGHT + Math.floor((time - nu7Time) / 1000 / POST_NU7_SPACING_S);
}

// ---------------------------------------------------------------------------
// Treasury runway scenario
// ---------------------------------------------------------------------------

export interface RunwayInput {
  treasuryZec: number;
  zecUsd: number;
  /** Grant spending per quarter, in USD. */
  quarterlySpendUsd: number;
  /** ZEC per day the stream adds while it runs. */
  streamZecPerDay: number;
  /** Unix ms when the stream stops (scheduled end, or an earlier policy change). */
  streamEndsAt: number;
  now: number;
}

export interface RunwayResult {
  /** Unix ms when the treasury runs out, or null if it lasts past the horizon. */
  depletedAt: number | null;
  /** Treasury in ZEC at the end of each month, for charting. */
  monthly: Array<{ t: number; zec: number }>;
}

const DAY_MS = 86_400_000;
const HORIZON_DAYS = 365 * 20;

/**
 * Day-by-day treasury balance with a constant ZEC price and spending rate.
 * Deliberately simple: no price changes, no investment returns, no new commitments.
 */
export function simulateRunway(i: RunwayInput): RunwayResult {
  const spendZecPerDay = i.zecUsd > 0 ? i.quarterlySpendUsd / (365 / 4) / i.zecUsd : Infinity;
  let zec = i.treasuryZec;
  const monthly: RunwayResult["monthly"] = [{ t: i.now, zec }];
  for (let d = 1; d <= HORIZON_DAYS; d++) {
    const t = i.now + d * DAY_MS;
    if (t <= i.streamEndsAt) zec += i.streamZecPerDay;
    zec -= spendZecPerDay;
    if (zec <= 0) {
      monthly.push({ t, zec: 0 });
      return { depletedAt: t, monthly };
    }
    if (d % 30 === 0) monthly.push({ t, zec });
  }
  return { depletedAt: null, monthly };
}
