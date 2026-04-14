/**
 * Grant domain types and UI config (status badges, categories, workflow).
 * Live rows are built in src/hooks/useGrants.ts from GitHub issues.
 */

import type { GrantProgram } from "@/lib/grantPrograms";

export type GrantStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "COMMUNITY_REVIEW"
  | "COMMITTEE_REVIEW"
  | "APPROVED"
  | "ACTIVE"
  | "COMPLETED"
  | "REJECTED"
  | "SUSPENDED";

export type GrantCategory =
  | "Infrastructure"
  | "Community"
  | "Education"
  | "Non-Wallet Applications"
  | "Integration"
  | "Wallets"
  | "Research & Development"
  | "Media"
  | "Zcash Protocol Extension"
  | "Dedicated Resource"
  | "Retroactive Event Funding"
  | "Event Sponsorships";

export interface Milestone {
  number: number;
  amount: number;
  dueDate: string;
  status: "Pending" | "In Progress" | "Submitted" | "Approved" | "Paid";
  userStories: string[];
  deliverables: string[];
  acceptanceCriteria: string;
}

export interface TeamMember {
  name: string;
  role: string;
  background: string;
  responsibilities: string;
  avatar?: string;
}

export interface Grant {
  /** Route id, e.g. `zcg-42` or `coinholder-7` */
  id: string;
  program: GrantProgram;
  /** GitHub repo slug, e.g. `ZcashCommunityGrants/zcashcommunitygrants` */
  sourceRepo: string;
  issueNumber: number;
  title: string;
  applicant: string;
  applicantAvatar: string;
  githubUsername: string;
  category: GrantCategory;
  status: GrantStatus;
  amount: number;
  submittedDate: string;
  lastUpdated: string;
  summary: string;
  description: string;
  problem: string;
  solution: string;
  solutionFormat: string;
  dependencies: string;
  technicalApproach: string;
  upstreamMerge: string;
  milestones: Milestone[];
  milestonesCompleted: number;
  totalMilestones: number;
  amountPaid: number;
  teamLead: TeamMember;
  teamMembers: TeamMember[];
  budget: {
    hardware: number;
    services: number;
    compensation: number;
    total: number;
  };
  risks: {
    implementation: string;
    sideEffects: string;
    successMetrics: string;
  };
  comments: {
    id: string;
    author: string;
    avatar: string;
    timestamp: string;
    body: string;
  }[];
  documents: { name: string; url: string; description: string }[];
  committeeMembers: string[];
  forumLink: string;
  githubLink: string;
}

export const statusConfig: Record<
  GrantStatus,
  { label: string; color: string; dotColor?: string }
> = {
  DRAFT: { label: "Draft", color: "bg-muted text-muted-foreground" },
  PENDING_REVIEW: {
    label: "Pending Review",
    color: "bg-yellow-500/20 text-yellow-400",
  },
  COMMUNITY_REVIEW: {
    label: "Community Review",
    color: "bg-blue-500/20 text-blue-400",
  },
  COMMITTEE_REVIEW: {
    label: "Committee Review",
    color: "bg-purple-500/20 text-purple-400",
  },
  APPROVED: {
    label: "Approved",
    color: "bg-emerald-500/20 text-emerald-400",
  },
  ACTIVE: {
    label: "Active",
    color: "bg-green-500/20 text-green-400",
    dotColor: "bg-green-400",
  },
  COMPLETED: {
    label: "Completed",
    color: "bg-teal-500/20 text-teal-400",
  },
  REJECTED: { label: "Rejected", color: "bg-red-500/20 text-red-400" },
  SUSPENDED: {
    label: "Suspended",
    color: "bg-orange-500/20 text-orange-400",
  },
};

export const categoryConfig: Record<GrantCategory, { color: string }> = {
  Infrastructure: {
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  Community: {
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  Education: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  "Non-Wallet Applications": {
    color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  },
  Integration: {
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  },
  Wallets: {
    color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  },
  "Research & Development": {
    color: "bg-teal-500/20 text-teal-400 border-teal-500/30",
  },
  Media: { color: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
  "Zcash Protocol Extension": {
    color: "bg-red-500/20 text-red-400 border-red-500/30",
  },
  "Dedicated Resource": {
    color: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  },
  "Retroactive Event Funding": {
    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  },
  "Event Sponsorships": {
    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  },
};

export const workflowSteps = [
  "Submitted",
  "Community Review",
  "Committee Review",
  "Approved",
  "Active",
  "Completed",
];

export function getWorkflowStep(status: GrantStatus): number {
  const map: Record<GrantStatus, number> = {
    DRAFT: -1,
    PENDING_REVIEW: 0,
    COMMUNITY_REVIEW: 1,
    COMMITTEE_REVIEW: 2,
    APPROVED: 3,
    ACTIVE: 4,
    COMPLETED: 5,
    REJECTED: -1,
    SUSPENDED: -1,
  };
  return map[status];
}
