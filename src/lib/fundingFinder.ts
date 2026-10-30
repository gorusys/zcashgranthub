/**
 * Funding Finder: maps a few answers about the work to the Zcash funding routes
 * that fit it, best first. Rules follow each program's published process
 * (ZCG selection page, FPF retro template, ZecHub contributing guide).
 */

export type WorkStage = "done" | "partly" | "planned";
export type WorkSize = "small" | "medium" | "large";
export type WorkKind = "software" | "content" | "community" | "security" | "research";

export interface FinderAnswers {
  stage: WorkStage;
  size: WorkSize;
  kind: WorkKind;
}

export type RouteId = "coinholder" | "zcg" | "zechub_bounties" | "zechub_dao";
export type Fit = "best" | "good" | "possible";

export interface FundingRoute {
  id: RouteId;
  name: string;
  fit: Fit;
  why: string[];
  steps: string[];
  /** Internal path or external URL for the primary action. */
  href: string;
  cta: string;
}

export const SIZE_LABEL: Record<WorkSize, string> = {
  small: "Under $1,000",
  medium: "$1,000 – $50,000",
  large: "Over $50,000",
};

const ZECHUB_BOUNTIES_URL = "https://bounties.zechub.wiki/";
const KYC_NOTE = "Requests above $50,000 require KYC with FPF before payout (you can stay pseudonymous publicly).";

const FIT_RANK: Record<Fit, number> = { best: 0, good: 1, possible: 2 };

export function recommendFunding({ stage, size, kind }: FinderAnswers): FundingRoute[] {
  const out: FundingRoute[] = [];
  const contentLike = kind === "content" || kind === "community";

  // Coinholder retro: completed, verifiable work only.
  if (stage !== "planned") {
    const why = [
      "Pays for work that is already done and publicly verifiable.",
      "Quarterly rounds; ZEC holders vote, with a 420,000 ZEC quorum and simple majority.",
    ];
    if (kind === "security") {
      why.push("Coinholders have strongly backed disclosed vulnerability reports and audits in past rounds.");
    }
    if (stage === "partly") {
      why.push("Only the finished part is eligible. Apply for the remaining work elsewhere and disclose both applications.");
    }
    if (size === "large") why.push(KYC_NOTE);
    out.push({
      id: "coinholder",
      name: "Coinholder retroactive grant",
      fit:
        stage === "done" && !(size === "small" && contentLike)
          ? "best"
          : stage === "done"
            ? "good"
            : "possible",
      why,
      steps: [
        "Check the current round's submission deadline.",
        "Fill the FPF GitHub template with evidence: repos, releases, deployments, usage numbers.",
        "Post it as a new thread in the forum's Retroactive Grants category.",
        "Answer questions during the 30-day review, then the vote.",
      ],
      href: "/retro",
      cta: "See round dates",
    });
  }

  // ZCG: forward-looking work with milestones.
  if (stage !== "done") {
    const why = [
      "Funds planned or ongoing work, paid out by milestone.",
      "Rolling applications; the committee reviews every other week after at least one week of community comment.",
      "Approval is a 3-of-5 committee vote; reasons are published in meeting minutes.",
      "Grantees post monthly progress updates on the forum.",
    ];
    if (size === "large") why.push(KYC_NOTE, "Larger requests get more diligence and more milestones.");
    out.push({
      id: "zcg",
      name: "Zcash Community Grants (ZCG)",
      fit: stage === "planned" && !(size === "small" && contentLike) ? "best" : "good",
      why,
      steps: [
        "Search past grants for similar work and read the committee's reasons.",
        "Draft scope, milestones with deliverables and dates, and a budget.",
        "Submit the GitHub application, then link it from a forum thread.",
      ],
      href: "/apply?tab=zcg",
      cta: "Start ZCG application",
    });
  }

  // ZecHub bounties: small, well-defined tasks.
  if (size === "small" && kind !== "security") {
    out.push({
      id: "zechub_bounties",
      name: "ZecHub bounties",
      fit: contentLike || kind === "software" ? "best" : "possible",
      why: [
        "Small, well-defined tasks (wiki pages, translations, tutorials, PRs) paid in shielded ZEC.",
        "Amounts follow ZecHub's published USD bands, converted at the spot ZEC price.",
        "Stages: merged → reward approved → paid.",
      ],
      steps: [
        "Pick an open bounty or propose one on the ZecHub Discord.",
        "Submit a pull request to the ZecHub repository.",
        "Share your shielded Unified Address for payout.",
      ],
      href: ZECHUB_BOUNTIES_URL,
      cta: "Browse bounties",
    });
  }

  // ZecHub DAO: community-voted spends for education and outreach.
  if (contentLike && size !== "large") {
    out.push({
      id: "zechub_dao",
      name: "ZecHub DAO proposal",
      fit: size === "medium" && stage === "planned" ? "good" : "possible",
      why: [
        "On-chain DAO DAO proposals (Juno) for education, media and community spends.",
        "Larger ZecHub rewards (shows, podcasts, sponsorships) go through the DAO.",
      ],
      steps: [
        "Read the ZecHub DAO guide.",
        "Discuss the idea on the ZecHub Discord first.",
        "Create a proposal on DAO DAO for members to vote on.",
      ],
      href: "/zechub/proposals/guide",
      cta: "Read the DAO guide",
    });
  }

  return out.sort((a, b) => FIT_RANK[a.fit] - FIT_RANK[b.fit]);
}
