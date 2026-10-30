/**
 * Coinholder-Directed Retroactive Grants (ZIP 1016) round schedule and outcomes.
 *
 * Schedule comes from src/data/retro-rounds.json (copied from FPF forum posts).
 * Outcomes come from the program's GitHub labels; a grant belongs to the round
 * whose submission window (previous deadline, this deadline] contains its issue
 * creation time. Postponed rounds have no window: their entries roll forward.
 */
import type { Grant } from "@/data/grantTypes";
import roundsData from "@/data/retro-rounds.json";

export interface RetroRound {
  id: string;
  label: string;
  status: "scheduled" | "postponed";
  note?: string;
  submissionsOpen: string;
  submissionDeadline?: string;
  reviewStart?: string;
  reviewEnd?: string;
  votingStart?: string;
  votingEnd?: string;
  resultsUrl?: string;
  sources: string[];
}

export type RetroPhase =
  | "upcoming"
  | "submissions"
  | "awaiting_review"
  | "review"
  | "awaiting_vote"
  | "voting"
  | "tallying"
  | "closed"
  | "postponed";

export const RETRO_ROUNDS: RetroRound[] = (roundsData.rounds as RetroRound[])
  .slice()
  .sort((a, b) => a.submissionsOpen.localeCompare(b.submissionsOpen));

/** ZIP 1016: at least this much ZEC must be voted on a proposal for the vote to count. */
export const RETRO_QUORUM_ZEC = 420_000;
/** Applications above this need KYC (program terms). */
export const RETRO_KYC_THRESHOLD_USD = 50_000;

export const RETRO_FORUM_CATEGORY_URL =
  "https://forum.zcashcommunity.com/c/grants/retroactive-grants/54";
export const RETRO_GITHUB_NEW_ISSUE_URL =
  "https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram/issues/new?template=grant_application.yaml";
export const OPENZCASH_RETRO_RESULTS_URL = "https://openzcash.org/coinholders/results";
export const OPENZCASH_RETRO_VERIFY_URL = "https://openzcash.org/coinholders/verify";

const t = (iso: string | undefined) => (iso ? Date.parse(iso) : NaN);

export function roundPhase(round: RetroRound, now: number = Date.now()): RetroPhase {
  if (round.status === "postponed") return "postponed";
  if (now < t(round.submissionsOpen)) return "upcoming";
  if (now <= t(round.submissionDeadline)) return "submissions";
  if (now < t(round.reviewStart)) return "awaiting_review";
  if (now <= t(round.reviewEnd)) return "review";
  if (now < t(round.votingStart)) return "awaiting_vote";
  if (now <= t(round.votingEnd)) return "voting";
  return round.resultsUrl ? "closed" : "tallying";
}

export const phaseLabel: Record<RetroPhase, string> = {
  upcoming: "Opens soon",
  submissions: "Accepting proposals",
  awaiting_review: "Review starting",
  review: "30-day community review",
  awaiting_vote: "Voting starts soon",
  voting: "Coinholder voting open",
  tallying: "Voting closed, results pending",
  closed: "Results published",
  postponed: "Postponed",
};

/** The round people should act on now: the first one not yet closed, else the latest. */
export function currentRound(
  rounds: RetroRound[] = RETRO_ROUNDS,
  now: number = Date.now()
): RetroRound | undefined {
  const scheduled = rounds.filter((r) => r.status === "scheduled");
  return (
    scheduled.find((r) => roundPhase(r, now) !== "closed") ??
    scheduled[scheduled.length - 1]
  );
}

/** Next date that changes what applicants or voters can do. */
export function nextMilestone(
  round: RetroRound,
  now: number = Date.now()
): { label: string; at: string } | null {
  const steps: Array<[string, string | undefined]> = [
    ["Submissions open", round.submissionsOpen],
    ["Submission deadline", round.submissionDeadline],
    ["Review period starts", round.reviewStart],
    ["Review period ends", round.reviewEnd],
    ["Voting opens", round.votingStart],
    ["Voting closes", round.votingEnd],
  ];
  for (const [label, at] of steps) {
    if (at && t(at) > now) return { label, at };
  }
  return null;
}

/** Round id for a Coinholder grant, or null if it falls outside every known window. */
export function roundIdForGrant(
  grant: Pick<Grant, "submittedDate">,
  rounds: RetroRound[] = RETRO_ROUNDS
): string | null {
  const created = t(grant.submittedDate);
  let prevDeadline = -Infinity;
  for (const r of rounds) {
    if (r.status !== "scheduled" || !r.submissionDeadline) continue;
    const deadline = t(r.submissionDeadline);
    if (created > prevDeadline && created <= deadline) return r.id;
    prevDeadline = deadline;
  }
  return null;
}

const hasLabel = (g: Pick<Grant, "labels">, needle: string) =>
  g.labels.some((l) => l.toLowerCase().includes(needle));

export type RetroOutcome = "funded" | "rejected" | "vetoed" | "on_ballot" | "pending" | "not_voted";

export function retroOutcome(g: Pick<Grant, "labels" | "status">): RetroOutcome {
  if (hasLabel(g, "vetoed")) return "vetoed";
  if (hasLabel(g, "approved by coinholders")) return "funded";
  if (hasLabel(g, "rejected by coinholders")) return "rejected";
  if (g.status === "WITHDRAWN") return "not_voted";
  if (hasLabel(g, "ready for vote")) return "on_ballot";
  return "pending";
}

export interface RetroRoundStats {
  roundId: string;
  /** Proposals that reached the ballot (funded + rejected + vetoed + on ballot). */
  onBallot: number;
  funded: number;
  rejected: number;
  vetoed: number;
  /** Submitted in the window but not (yet) on the ballot. */
  pending: number;
  notVoted: number;
  requestedUsd: number;
  fundedUsd: number;
  grants: Grant[];
}

export function statsForRounds(
  grants: Grant[],
  rounds: RetroRound[] = RETRO_ROUNDS
): Map<string, RetroRoundStats> {
  const out = new Map<string, RetroRoundStats>();
  for (const r of rounds) {
    if (r.status !== "scheduled") continue;
    out.set(r.id, {
      roundId: r.id,
      onBallot: 0,
      funded: 0,
      rejected: 0,
      vetoed: 0,
      pending: 0,
      notVoted: 0,
      requestedUsd: 0,
      fundedUsd: 0,
      grants: [],
    });
  }
  for (const g of grants) {
    if (g.program !== "coinholder") continue;
    const id = roundIdForGrant(g, rounds);
    const s = id ? out.get(id) : undefined;
    if (!s) continue;
    s.grants.push(g);
    const outcome = retroOutcome(g);
    if (outcome === "not_voted") {
      s.notVoted++;
      continue;
    }
    if (outcome === "pending") {
      s.pending++;
      continue;
    }
    s.onBallot++;
    s.requestedUsd += g.amount;
    if (outcome === "funded") {
      s.funded++;
      s.fundedUsd += g.amount;
    } else if (outcome === "rejected") s.rejected++;
    else if (outcome === "vetoed") s.vetoed++;
  }
  return out;
}

export type RetroAnnouncementKind =
  | "results"
  | "voting"
  | "registration"
  | "review"
  | "call"
  | "schedule"
  | "other";

export interface RetroAnnouncement {
  id: number;
  title: string;
  href: string;
  createdAt: string;
  kind: RetroAnnouncementKind;
}

/** Classifies an organizer post title (FPF / poll coordinators) by round phase. */
export function announcementKind(title: string): RetroAnnouncementKind {
  const s = title.toLowerCase();
  if (/results|polling closed/.test(s)) return "results";
  if (/voting|polling|poll\b/.test(s)) return "voting";
  if (/registration/.test(s)) return "registration";
  if (/review period/.test(s)) return "review";
  if (/call for proposals|accepting proposals/.test(s)) return "call";
  if (/dates|plan ahead|schedule/.test(s)) return "schedule";
  return "other";
}
