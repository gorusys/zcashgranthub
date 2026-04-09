import type { DaoProposalSingleRaw, ZechubProposalUiStatus, ZechubProposalView } from "./types";
import { zechubProposalDaodaoUrl } from "./zechubConfig";

function mapRawStatus(raw: string): ZechubProposalUiStatus {
  const s = raw.toLowerCase();
  if (s === "open" || s === "voting") return "in_voting";
  if (s === "executed" || s === "passed") return "passed";
  if (s === "rejected") return "rejected";
  if (s === "draft") return "draft";
  return "closed";
}

function nanosToIso(nanos: string | undefined): string | null {
  if (!nanos) return null;
  try {
    const ms = BigInt(nanos) / 1_000_000n;
    return new Date(Number(ms)).toISOString();
  } catch {
    return null;
  }
}

export function normalizeZechubProposal(raw: DaoProposalSingleRaw): ZechubProposalView {
  const y = parseInt(raw.proposal.votes.yes, 10) || 0;
  const n = parseInt(raw.proposal.votes.no, 10) || 0;
  const a = parseInt(raw.proposal.votes.abstain, 10) || 0;
  const t = y + n + a;
  const safe = t > 0 ? t : 1;

  return {
    id: raw.id,
    title: raw.proposal.title,
    status: mapRawStatus(raw.proposal.status),
    rawStatus: raw.proposal.status,
    votes: { yes: y, no: n, abstain: a },
    votePercent: {
      yes: Math.round((y / safe) * 1000) / 10,
      no: Math.round((n / safe) * 1000) / 10,
      abstain: Math.round((a / safe) * 1000) / 10,
    },
    totalVotes: t,
    expiresAtIso: nanosToIso(raw.proposal.expiration?.at_time),
    daodaoUrl: zechubProposalDaodaoUrl(raw.id),
  };
}
