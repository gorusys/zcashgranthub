/** Raw proposal payload from indexer `daoProposalSingle/proposal` */
export interface DaoProposalSingleRaw {
  id: number;
  proposal: {
    title: string;
    description: string;
    status: string;
    votes: { yes: string; no: string; abstain: string };
    expiration?: { at_time: string };
    total_power?: string;
  };
}

export type ZechubProposalUiStatus =
  | "draft"
  | "in_voting"
  | "passed"
  | "rejected"
  | "closed";

/** Normalized view for the grant detail UI */
export interface ZechubProposalView {
  id: number;
  title: string;
  /** Proposal body / description from indexer (markdown or plain) */
  description: string;
  status: ZechubProposalUiStatus;
  rawStatus: string;
  votes: { yes: number; no: number; abstain: number };
  /** 0–100 for each option */
  votePercent: { yes: number; no: number; abstain: number };
  totalVotes: number;
  expiresAtIso: string | null;
  daodaoUrl: string;
}

export interface ZechubDaoMeta {
  name: string;
  proposalCount: number;
  chainId: string;
  daoCoreAddress: string;
}
