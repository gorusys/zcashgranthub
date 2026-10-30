import { describe, expect, it } from "vitest";
import type { Grant } from "@/data/grantTypes";
import { labelToStatus } from "@/lib/parseIssue";
import {
  currentRound,
  nextMilestone,
  RETRO_ROUNDS,
  retroOutcome,
  roundIdForGrant,
  roundPhase,
  statsForRounds,
} from "@/lib/retroRounds";

const at = (iso: string) => Date.parse(iso);
const q3 = RETRO_ROUNDS.find((r) => r.id === "q3-2026")!;
const q4 = RETRO_ROUNDS.find((r) => r.id === "q4-2026")!;

function grant(
  submittedDate: string,
  labels: string[],
  amount = 1000,
  state: "open" | "closed" = "closed"
): Grant {
  return {
    program: "coinholder",
    submittedDate,
    labels,
    amount,
    status: labelToStatus(labels.map((name) => ({ name })), state, "coinholder"),
  } as Grant;
}

describe("retro round schedule", () => {
  it("walks through every phase of a round", () => {
    expect(roundPhase(q4, at("2026-10-29T12:00:00Z"))).toBe("upcoming");
    expect(roundPhase(q4, at("2026-10-30T08:00:00Z"))).toBe("submissions");
    expect(roundPhase(q4, at("2026-11-13T20:00:00Z"))).toBe("submissions");
    expect(roundPhase(q4, at("2026-11-14T00:00:00Z"))).toBe("awaiting_review");
    expect(roundPhase(q4, at("2026-12-01T00:00:00Z"))).toBe("review");
    expect(roundPhase(q4, at("2026-12-20T00:00:00Z"))).toBe("voting");
    expect(roundPhase(q4, at("2026-12-30T00:00:00Z"))).toBe("tallying");
    expect(roundPhase(q3, at("2026-12-30T00:00:00Z"))).toBe("closed");
  });

  it("picks the first round that is not closed", () => {
    expect(currentRound(RETRO_ROUNDS, at("2026-10-30T08:00:00Z"))?.id).toBe("q4-2026");
    expect(currentRound(RETRO_ROUNDS, at("2026-09-20T00:00:00Z"))?.id).toBe("q3-2026");
    expect(currentRound(RETRO_ROUNDS, at("2027-06-01T00:00:00Z"))?.id).toBe("q4-2026");
  });

  it("returns the next milestone", () => {
    expect(nextMilestone(q4, at("2026-10-30T08:00:00Z"))).toEqual({
      label: "Submission deadline",
      at: "2026-11-13T20:00:00Z",
    });
    expect(nextMilestone(q4, at("2027-01-01T00:00:00Z"))).toBeNull();
  });
});

describe("retro round membership and outcomes", () => {
  it("rolls postponed Q2 submissions into Q3", () => {
    expect(roundIdForGrant({ submittedDate: "2026-04-16T18:07:00Z" })).toBe("q3-2026");
    expect(roundIdForGrant({ submittedDate: "2026-08-14T19:51:00Z" })).toBe("q3-2026");
    expect(roundIdForGrant({ submittedDate: "2026-08-15T02:37:00Z" })).toBe("q4-2026");
    expect(roundIdForGrant({ submittedDate: "2026-02-15T09:37:00Z" })).toBe("q1-2026");
  });

  it("maps coinholder labels to outcomes", () => {
    const vetoed = grant("2025-09-27T00:00:00Z", ["Approved by Coinholders", "Vetoed by Key Holder"]);
    expect(vetoed.status).toBe("REJECTED");
    expect(retroOutcome(vetoed)).toBe("vetoed");

    const closedNoLabel = grant("2025-10-11T00:00:00Z", []);
    expect(closedNoLabel.status).toBe("WITHDRAWN");
    expect(retroOutcome(closedNoLabel)).toBe("not_voted");

    const late = grant("2026-08-15T02:37:00Z", ["Submitted Past Deadline - Please resubmit next Q"]);
    expect(late.status).toBe("WITHDRAWN");

    const approvedAwaitingKyc = grant("2026-08-14T00:00:00Z", ["Approved by Coinholders", "KYC Required"]);
    expect(approvedAwaitingKyc.status).toBe("APPROVED");

    const fresh = grant("2026-10-30T05:43:00Z", [], 75000, "open");
    expect(fresh.status).toBe("PENDING_REVIEW");
    expect(retroOutcome(fresh)).toBe("pending");
  });

  it("aggregates per-round stats from ballot outcomes only", () => {
    const stats = statsForRounds([
      grant("2026-05-01T00:00:00Z", ["Approved by Coinholders", "Funds Disbursed by Keyholders"], 5000),
      grant("2026-08-01T00:00:00Z", ["Rejected by Coinholders", "Ready For Vote - All Steps Completed"], 3000),
      grant("2026-08-14T20:00:00Z", []), // closed, no decision
      grant("2026-10-30T05:43:00Z", [], 75000, "open"),
    ]);
    const s3 = stats.get("q3-2026")!;
    expect(s3).toMatchObject({ onBallot: 2, funded: 1, rejected: 1, notVoted: 1, requestedUsd: 8000, fundedUsd: 5000 });
    expect(stats.get("q4-2026")).toMatchObject({ onBallot: 0, pending: 1 });
  });
});
