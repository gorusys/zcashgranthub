/**
 * Project directory: funded grants grouped by the GitHub account that applied,
 * with totals, linked repositories and which core repos each grant touches.
 */
import type { Grant, GrantStatus } from "@/data/grantTypes";
import type { GrantProgram } from "@/lib/grantPrograms";
import { reposForGrant } from "@/lib/repoLinks";
import { retroOutcome } from "@/lib/retroRounds";
import coreData from "@/data/core-repos.json";

export interface CoreRepo {
  repo: string;
  role: string;
  name: string;
  desc: string;
}
export const CORE_REPOS: CoreRepo[] = coreData.repos;

export interface ProjectGrant {
  id: string;
  title: string;
  program: GrantProgram;
  status: GrantStatus;
  amountUsd: number;
  paidUsd: number;
  submittedDate: string;
  repos: string[];
}

export interface Project {
  /** GitHub login of the applicant. */
  owner: string;
  avatar: string;
  grants: ProjectGrant[];
  fundedUsd: number;
  paidUsd: number;
  categories: string[];
  repos: string[];
  firstFunded: string;
  lastFunded: string;
}

export interface CoreRepoFunding extends CoreRepo {
  grantIds: string[];
}

const ZCG_FUNDED: GrantStatus[] = ["APPROVED", "ACTIVE", "COMPLETED"];

export function isFunded(g: Grant): boolean {
  return g.program === "zcg" ? ZCG_FUNDED.includes(g.status) : retroOutcome(g) === "funded";
}

export function paidUsd(g: Grant): number {
  if (g.program === "zcg") return g.amountPaid;
  return g.labels.some((l) => /funds disbursed/i.test(l)) ? g.amount : 0;
}

export function buildProjects(grants: Grant[]): { projects: Project[]; core: CoreRepoFunding[] } {
  const byOwner = new Map<string, Project>();
  const coreIndex = new Map(CORE_REPOS.map((c) => [c.repo.toLowerCase(), { ...c, grantIds: [] as string[] }]));

  for (const g of grants) {
    if (!isFunded(g) || !g.githubUsername) continue;
    const repos = reposForGrant(g);
    for (const r of repos) coreIndex.get(r.toLowerCase())?.grantIds.push(g.id);

    const key = g.githubUsername.toLowerCase();
    let p = byOwner.get(key);
    if (!p) {
      p = { owner: g.githubUsername, avatar: g.applicantAvatar, grants: [], fundedUsd: 0, paidUsd: 0, categories: [], repos: [], firstFunded: g.submittedDate, lastFunded: g.submittedDate };
      byOwner.set(key, p);
    }
    const paid = paidUsd(g);
    p.grants.push({ id: g.id, title: g.title, program: g.program, status: g.status, amountUsd: g.amount, paidUsd: paid, submittedDate: g.submittedDate, repos });
    p.fundedUsd += g.amount;
    p.paidUsd += paid;
    if (!p.categories.includes(g.category)) p.categories.push(g.category);
    for (const r of repos) if (!p.repos.some((x) => x.toLowerCase() === r.toLowerCase())) p.repos.push(r);
    if (g.submittedDate < p.firstFunded) p.firstFunded = g.submittedDate;
    if (g.submittedDate > p.lastFunded) p.lastFunded = g.submittedDate;
  }

  const projects = [...byOwner.values()]
    .map((p) => ({ ...p, grants: p.grants.sort((a, b) => b.submittedDate.localeCompare(a.submittedDate)) }))
    .sort((a, b) => b.fundedUsd - a.fundedUsd);
  return { projects, core: [...coreIndex.values()] };
}
