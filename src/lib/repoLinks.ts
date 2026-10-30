/** GitHub repositories referenced by a grant application (deliverables, docs, team links). */
import type { Grant } from "@/data/grantTypes";

/** Repos that host applications or are template links, not deliverables. */
const IGNORE = new Set(
  [
    "ZcashCommunityGrants/zcashcommunitygrants",
    "Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram",
  ].map((r) => r.toLowerCase())
);
/** First path segments on github.com that are GitHub's own pages, not user/org names. */
const RESERVED_OWNERS = new Set([
  "about", "advisories", "apps", "codespaces", "collections", "contact", "customer-stories", "enterprise",
  "explore", "features", "issues", "login", "marketplace", "notifications", "orgs", "pricing", "pulls",
  "readme", "search", "security", "settings", "sponsors", "topics", "trending", "user-attachments",
]);

const REPO_RE = /github\.com\/([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100})/g;

export function extractRepos(text: string): string[] {
  const seen = new Map<string, string>();
  for (const m of text.matchAll(REPO_RE)) {
    const owner = m[1];
    const name = m[2].replace(/\.git$/i, "").replace(/[.]+$/, "");
    if (!name || RESERVED_OWNERS.has(owner.toLowerCase())) continue;
    const slug = `${owner}/${name}`;
    const key = slug.toLowerCase();
    if (IGNORE.has(key) || seen.has(key)) continue;
    seen.set(key, slug);
  }
  return [...seen.values()];
}

/** All repos linked anywhere in a (full) grant record, in order of first mention. */
export function reposForGrant(g: Grant): string[] {
  const text = [
    g.summary,
    g.description,
    g.solution,
    g.solutionFormat,
    g.technicalApproach,
    g.dependencies,
    g.upstreamMerge,
    g.teamLead.background,
    ...g.teamMembers.map((m) => m.background),
    ...g.documents.map((d) => d.url),
    ...g.milestones.flatMap((m) => [...m.deliverables, m.acceptanceCriteria]),
  ].join("\n");
  return extractRepos(text);
}
