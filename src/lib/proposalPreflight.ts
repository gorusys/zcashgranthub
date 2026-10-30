/**
 * Pre-submission checks for ZCG applications, plus a "similar past grants" lookup.
 * Checks are advisory: they flag what reviewers commonly ask about (budget
 * consistency, dated milestones with deliverables, measurable KPIs, disclosure),
 * following the ZCG grant process (zcashcommunitygrants.org/selection).
 */
import type { Grant } from "@/data/grantTypes";
import type { ZcgApplyDraftPayload } from "@/lib/zcgApplyDraft";

export type CheckLevel = "error" | "warning" | "info";

export interface PreflightCheck {
  id: string;
  level: CheckLevel;
  message: string;
  /** Wizard step to jump to for fixing it. */
  step?: number;
}

/** Wizard step indices in ApplyPage's STEPS. */
export const STEP = {
  terms: 0,
  applicant: 1,
  project: 2,
  team: 3,
  problem: 4,
  budget: 5,
  risks: 6,
  milestones: 7,
  documents: 8,
} as const;

export const KYC_THRESHOLD_USD = 50_000;

type Input = Pick<ZcgApplyDraftPayload, "formData" | "milestones" | "teamMembers">;

const num = (v: string | undefined) => {
  const n = Number(String(v ?? "").replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const blank = (v: string | undefined) => !v || !v.trim();
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export function preflightZcg(input: Input, today: Date = new Date()): PreflightCheck[] {
  const f = input.formData;
  const out: PreflightCheck[] = [];
  const add = (c: PreflightCheck) => out.push(c);

  // Project basics
  if (blank(f.title) || /\{.*\}/.test(f.title ?? "")) {
    add({ id: "title", level: "error", message: "Give the project a real title (no template placeholder).", step: STEP.project });
  }
  if ((f.summary ?? "").trim().length < 80) {
    add({ id: "summary", level: "warning", message: "The summary is very short. Say in two or three sentences what you will deliver and who uses it.", step: STEP.project });
  }

  // Budget
  const hardware = num(f.hardware);
  const services = num(f.services);
  const compensation = num(f.compensation);
  const total = hardware + services + compensation;
  const requested = num(f.amount);

  if (total <= 0) {
    add({ id: "budget-empty", level: "error", message: "The budget is empty. Break the request into hardware/software, services and compensation.", step: STEP.budget });
  }
  if (requested > 0 && total > 0 && Math.abs(requested - total) >= 1) {
    add({ id: "budget-requested", level: "error", message: `Requested amount (${usd(requested)}) does not match the budget total (${usd(total)}).`, step: STEP.budget });
  }
  for (const [amount, just, label] of [
    [hardware, f.hardwareJustification, "hardware/software"],
    [services, f.serviceJustification, "services"],
    [compensation, f.compensationJustification, "compensation"],
  ] as const) {
    if (amount > 0 && blank(just)) {
      add({ id: `just-${label}`, level: "warning", message: `Justify the ${label} cost (rates, hours, or quotes).`, step: STEP.budget });
    }
  }
  const startup = num(f.startupAmount);
  if (startup > 0) {
    if (total > 0 && startup > total) {
      add({ id: "startup-total", level: "error", message: "The startup payment is larger than the whole budget.", step: STEP.milestones });
    }
    if (blank(f.startupJustification)) {
      add({ id: "startup-just", level: "warning", message: "Explain why a startup payment is needed.", step: STEP.milestones });
    }
  }
  if (f.prevFunding === "yes" && blank(f.prevFundingDetails)) {
    add({ id: "prev-funding", level: "warning", message: "You said you received Zcash funding before. Link those grants and their outcomes.", step: STEP.budget });
  }
  if (f.otherFunding === "yes" && blank(f.otherFundingDetails)) {
    add({ id: "other-funding", level: "warning", message: "Disclose the other funding sources for this work (including other Zcash programs).", step: STEP.budget });
  }

  // Milestones
  const ms = input.milestones;
  if (ms.length === 0) {
    add({ id: "ms-none", level: "error", message: "Add at least one milestone with a date, deliverables and acceptance criteria.", step: STEP.milestones });
  } else {
    const msTotal = ms.reduce((s, m) => s + num(m.amount), 0) + startup;
    if (total > 0 && Math.abs(msTotal - total) >= 1) {
      add({
        id: "ms-sum",
        level: "error",
        message: `Milestones${startup > 0 ? " plus startup payment" : ""} add up to ${usd(msTotal)}, but the budget total is ${usd(total)}.`,
        step: STEP.milestones,
      });
    }
    const todayIso = today.toISOString().slice(0, 10);
    let prevDate = "";
    ms.forEach((m, i) => {
      const n = i + 1;
      if (blank(m.date)) {
        add({ id: `ms-${n}-date`, level: "error", message: `Milestone ${n} has no completion date.`, step: STEP.milestones });
      } else {
        if (m.date < todayIso) {
          add({ id: `ms-${n}-past`, level: "warning", message: `Milestone ${n} is dated in the past (${m.date}). Finished work fits the Coinholder retro program better.`, step: STEP.milestones });
        }
        if (prevDate && m.date < prevDate) {
          add({ id: `ms-${n}-order`, level: "warning", message: `Milestone ${n} is due before milestone ${i}.`, step: STEP.milestones });
        }
        prevDate = m.date;
      }
      if (num(m.amount) <= 0) {
        add({ id: `ms-${n}-amount`, level: "error", message: `Milestone ${n} has no amount.`, step: STEP.milestones });
      }
      if (!m.deliverables.some((d) => !blank(d))) {
        add({ id: `ms-${n}-deliv`, level: "error", message: `Milestone ${n} lists no deliverables.`, step: STEP.milestones });
      }
      if (blank(m.criteria)) {
        add({ id: `ms-${n}-criteria`, level: "warning", message: `Milestone ${n} has no acceptance criteria. Say how reviewers can verify it is done.`, step: STEP.milestones });
      }
    });
    if (total > KYC_THRESHOLD_USD) {
      const largest = Math.max(...ms.map((m) => num(m.amount)));
      if (ms.length < 3 || largest > total * 0.5) {
        add({ id: "ms-granularity", level: "warning", message: "For a request this size, reviewers expect several smaller milestones; no single milestone should be most of the budget.", step: STEP.milestones });
      }
    }
  }

  // Risks and success metrics
  if (blank(f.successMetrics)) {
    add({ id: "kpi-missing", level: "error", message: "Add success metrics.", step: STEP.risks });
  } else if (!/\d/.test(f.successMetrics ?? "")) {
    add({ id: "kpi-numbers", level: "warning", message: "Make success metrics measurable (numbers and dates, e.g. users, downloads, merged PRs).", step: STEP.risks });
  }
  if (blank(f.implRisks)) {
    add({ id: "risks", level: "warning", message: "Describe implementation risks and how you will handle them.", step: STEP.risks });
  }

  // Team
  if (blank(f.leadBg)) {
    add({ id: "lead-bg", level: "warning", message: "Add the project lead's background and links to prior work.", step: STEP.team });
  }

  // Informational
  if (total > KYC_THRESHOLD_USD) {
    add({ id: "kyc", level: "info", message: `Requests above ${usd(KYC_THRESHOLD_USD)} need KYC with FPF before any payout. You can stay pseudonymous publicly.` });
  }
  add({ id: "updates", level: "info", message: "If funded, post monthly progress updates on your forum thread. They are required before milestone payouts." });

  const rank: Record<CheckLevel, number> = { error: 0, warning: 1, info: 2 };
  return out.sort((a, b) => rank[a.level] - rank[b.level]);
}

// ---------------------------------------------------------------------------
// Similar past grants
// ---------------------------------------------------------------------------

const STOP = new Set(
  "the and for with that this from into your our are will can its their have has using use based build building project zcash zec grant application support new open source community development".split(
    " "
  )
);

export function keywords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter((w) => w.length > 2 && !STOP.has(w))
  );
}

export interface SimilarGrant {
  grant: Grant;
  score: number;
}

/** Past grants whose title/summary share the most keywords with the draft (title counts double). */
export function findSimilarGrants(
  draft: { title: string; summary: string },
  grants: Grant[],
  limit = 5
): SimilarGrant[] {
  const dTitle = keywords(draft.title);
  const dAll = new Set([...dTitle, ...keywords(draft.summary)]);
  if (dAll.size === 0) return [];

  const scored: SimilarGrant[] = [];
  for (const g of grants) {
    const gTitle = keywords(g.title);
    const gAll = new Set([...gTitle, ...keywords(g.summary)]);
    let hit = 0;
    for (const w of dAll) {
      if (gAll.has(w)) hit += dTitle.has(w) && gTitle.has(w) ? 2 : 1;
    }
    if (hit === 0) continue;
    const score = hit / Math.sqrt(dAll.size * Math.max(gAll.size, 1));
    if (score >= 0.15 && hit >= 2) scored.push({ grant: g, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}
