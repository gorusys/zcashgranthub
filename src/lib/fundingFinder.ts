/**
 * Funding Finder: maps a few answers about the work to the Zcash funding routes
 * that fit it, best first. Rules follow each program's published process
 * (ZCG selection page, FPF retro template, ZecHub contributing guide).
 */

export type WorkStage = "done" | "partly" | "planned";
export type WorkSize = "small" | "medium" | "large";
export type WorkKind = "software" | "content" | "community" | "security" | "research";

import { translateEn, type Translate } from "@/i18n/translate";

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



const FIT_RANK: Record<Fit, number> = { best: 0, good: 1, possible: 2 };

export function recommendFunding({ stage, size, kind }: FinderAnswers, t: Translate = translateEn): FundingRoute[] {
  const out: FundingRoute[] = [];
  const contentLike = kind === "content" || kind === "community";

  // Coinholder retro: completed, verifiable work only.
  if (stage !== "planned") {
    const why = [
      t("route.coinholder.why1"),
      t("route.coinholder.why2"),
    ];
    if (kind === "security") {
      why.push(t("route.coinholder.whySecurity"));
    }
    if (stage === "partly") {
      why.push(t("route.coinholder.whyPartly"));
    }
    if (size === "large") why.push(t("route.kyc"));
    out.push({
      id: "coinholder",
      name: t("route.coinholder.name"),
      fit:
        stage === "done" && !(size === "small" && contentLike)
          ? "best"
          : stage === "done"
            ? "good"
            : "possible",
      why,
      steps: [
        t("route.coinholder.step1"),
        t("route.coinholder.step2"),
        t("route.coinholder.step3"),
        t("route.coinholder.step4"),
      ],
      href: "/retro",
      cta: t("route.coinholder.cta"),
    });
  }

  // ZCG: forward-looking work with milestones.
  if (stage !== "done") {
    const why = [
      t("route.zcg.why1"),
      t("route.zcg.why2"),
      t("route.zcg.why3"),
      t("route.zcg.why4"),
    ];
    if (size === "large") why.push(t("route.kyc"), t("route.zcg.whyLarge"));
    out.push({
      id: "zcg",
      name: t("route.zcg.name"),
      fit: stage === "planned" && !(size === "small" && contentLike) ? "best" : "good",
      why,
      steps: [
        t("route.zcg.step1"),
        t("route.zcg.step2"),
        t("route.zcg.step3"),
      ],
      href: "/apply?tab=zcg",
      cta: t("route.zcg.cta"),
    });
  }

  // ZecHub bounties: small, well-defined tasks.
  if (size === "small" && kind !== "security") {
    out.push({
      id: "zechub_bounties",
      name: t("route.bounties.name"),
      fit: contentLike || kind === "software" ? "best" : "possible",
      why: [
        t("route.bounties.why1"),
        t("route.bounties.why2"),
        t("route.bounties.why3"),
      ],
      steps: [
        t("route.bounties.step1"),
        t("route.bounties.step2"),
        t("route.bounties.step3"),
      ],
      href: "/bounties",
      cta: t("route.bounties.cta"),
    });
  }

  // ZecHub DAO: community-voted spends for education and outreach.
  if (contentLike && size !== "large") {
    out.push({
      id: "zechub_dao",
      name: t("route.dao.name"),
      fit: size === "medium" && stage === "planned" ? "good" : "possible",
      why: [
        t("route.dao.why1"),
        t("route.dao.why2"),
      ],
      steps: [
        t("route.dao.step1"),
        t("route.dao.step2"),
        t("route.dao.step3"),
      ],
      href: "/zechub/proposals/guide",
      cta: t("route.dao.cta"),
    });
  }

  return out.sort((a, b) => FIT_RANK[a.fit] - FIT_RANK[b.fit]);
}
