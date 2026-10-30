/**
 * Shapes for the public read-only API (/api/v1/*) and feeds. Stable field names:
 * add fields freely, but don't rename or remove them without bumping the version.
 */
import type { Grant, GrantStatus } from "@/data/grantTypes";
import type { GrantProgram } from "@/lib/grantPrograms";
import {
  RETRO_ROUNDS,
  nextMilestone,
  roundPhase,
  statsForRounds,
  type RetroPhase,
} from "@/lib/retroRounds";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://zgrantshub.com").replace(/\/$/, "");

export interface PublicGrant {
  id: string;
  program: GrantProgram;
  issueNumber: number;
  title: string;
  status: GrantStatus;
  category: string;
  applicant: string;
  amountUsd: number;
  amountPaidUsd: number;
  milestones: { total: number; paid: number };
  labels: string[];
  submittedAt: string;
  updatedAt: string;
  summary: string;
  url: string;
  githubUrl: string;
}

export function toPublicGrant(g: Grant): PublicGrant {
  return {
    id: g.id,
    program: g.program,
    issueNumber: g.issueNumber,
    title: g.title,
    status: g.status,
    category: g.category,
    applicant: g.applicant,
    amountUsd: g.amount,
    amountPaidUsd: g.amountPaid,
    milestones: { total: g.totalMilestones, paid: g.milestonesCompleted },
    labels: g.labels,
    submittedAt: g.submittedDate,
    updatedAt: g.lastUpdated,
    summary: g.summary,
    url: `${SITE_URL}/grants/${g.id}`,
    githubUrl: g.githubLink,
  };
}

export interface GrantQuery {
  program?: string;
  status?: string;
  category?: string;
  q?: string;
  updatedSince?: string;
}

export function filterGrants(grants: Grant[], query: GrantQuery): Grant[] {
  const statuses = query.status?.toUpperCase().split(",").filter(Boolean);
  const since = query.updatedSince ? Date.parse(query.updatedSince) : NaN;
  const q = query.q?.trim().toLowerCase();
  return grants.filter(
    (g) =>
      (!query.program || g.program === query.program) &&
      (!statuses?.length || statuses.includes(g.status)) &&
      (!query.category || g.category.toLowerCase() === query.category.toLowerCase()) &&
      (Number.isNaN(since) || Date.parse(g.lastUpdated) >= since) &&
      (!q || g.title.toLowerCase().includes(q) || g.summary.toLowerCase().includes(q))
  );
}

export interface PublicRetroRound {
  id: string;
  label: string;
  status: "scheduled" | "postponed";
  phase: RetroPhase;
  nextMilestone: { label: string; at: string } | null;
  submissionsOpen: string;
  submissionDeadline?: string;
  reviewStart?: string;
  reviewEnd?: string;
  votingStart?: string;
  votingEnd?: string;
  resultsUrl?: string;
  sources: string[];
  outcomes?: {
    onBallot: number;
    funded: number;
    rejected: number;
    vetoed: number;
    pending: number;
    requestedUsd: number;
    fundedUsd: number;
    grantIds: string[];
  };
}

export function publicRetroRounds(grants: Grant[], now: number = Date.now()): PublicRetroRound[] {
  const stats = statsForRounds(grants);
  return RETRO_ROUNDS.map((r) => {
    const s = stats.get(r.id);
    return {
      id: r.id,
      label: r.label,
      status: r.status,
      phase: roundPhase(r, now),
      nextMilestone: r.status === "scheduled" ? nextMilestone(r, now) : null,
      submissionsOpen: r.submissionsOpen,
      submissionDeadline: r.submissionDeadline,
      reviewStart: r.reviewStart,
      reviewEnd: r.reviewEnd,
      votingStart: r.votingStart,
      votingEnd: r.votingEnd,
      resultsUrl: r.resultsUrl,
      sources: r.sources,
      outcomes: s && {
        onBallot: s.onBallot,
        funded: s.funded,
        rejected: s.rejected,
        vetoed: s.vetoed,
        pending: s.pending,
        requestedUsd: s.requestedUsd,
        fundedUsd: s.fundedUsd,
        grantIds: s.grants.map((g) => g.id),
      },
    };
  });
}

const xmlEscape = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

/** RSS 2.0 feed of the most recently updated grants. */
export function grantsRss(grants: Grant[], limit = 50): string {
  const items = grants
    .slice()
    .sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated))
    .slice(0, limit)
    .map((g) => {
      const p = toPublicGrant(g);
      const desc = `${p.program.toUpperCase()} · ${p.status.replace(/_/g, " ").toLowerCase()} · $${p.amountUsd.toLocaleString("en-US")}${p.summary ? ` — ${p.summary.slice(0, 400)}` : ""}`;
      return [
        "<item>",
        `<title>${xmlEscape(`[${p.program === "zcg" ? "ZCG" : "Coinholder"}] ${p.title}`)}</title>`,
        `<link>${xmlEscape(p.url)}</link>`,
        `<guid isPermaLink="false">${xmlEscape(`${p.id}@${p.updatedAt}`)}</guid>`,
        `<pubDate>${new Date(p.updatedAt).toUTCString()}</pubDate>`,
        `<category>${xmlEscape(p.status)}</category>`,
        `<description>${xmlEscape(desc)}</description>`,
        "</item>",
      ].join("");
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>Zcash Grants Hub: grant updates</title>
<link>${SITE_URL}/grants</link>
<atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
<description>New and updated Zcash Community Grants and Coinholder grant applications.</description>
<language>en</language>
${items}
</channel>
</rss>`;
}
