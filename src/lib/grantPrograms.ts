/** ZCG vs Coinholder GitHub application lanes (ZecHub DAO is separate). */
export type GrantProgram = "zcg" | "coinholder";

export const OFFICIAL_ZCG_REPO = "ZcashCommunityGrants/zcashcommunitygrants";
export const DEFAULT_COINHOLDER_REPO =
  "Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram";

export const GRANTS_DASHBOARD_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1FQ28rDCyRW0TiNxrm3rgD8ai2KGUsXAjPieQmI1kKKg";

export interface GrantRepoConfig {
  slug: string;
  program: GrantProgram;
}

/** ZCG repo from env (legacy single-repo) plus optional Coinholder repo. */
export function getGrantRepoConfigs(): GrantRepoConfig[] {
  const zcg =
    process.env.NEXT_PUBLIC_GITHUB_REPO ||
    process.env.VITE_GITHUB_REPO ||
    OFFICIAL_ZCG_REPO;
  const coinholder =
    process.env.NEXT_PUBLIC_GITHUB_REPO_COINHOLDER || DEFAULT_COINHOLDER_REPO;

  const includeCoinholder =
    process.env.NEXT_PUBLIC_GITHUB_REPO_COINHOLDER_DISABLED !== "1";

  const list: GrantRepoConfig[] = [{ slug: zcg, program: "zcg" }];
  if (includeCoinholder && coinholder) {
    list.push({ slug: coinholder, program: "coinholder" });
  }
  return list;
}

export function formatGrantId(program: GrantProgram, issueNumber: number): string {
  return `${program}-${issueNumber}`;
}

/** Parse route id: `zcg-123`, `coinholder-4`, or legacy numeric `123` (ZCG). */
export function parseGrantRouteId(id: string): {
  program: GrantProgram;
  issueNumber: number;
} {
  const composite = id.match(/^(zcg|coinholder)-(\d+)$/i);
  if (composite) {
    const program = composite[1].toLowerCase() as GrantProgram;
    return { program, issueNumber: parseInt(composite[2], 10) };
  }
  const n = parseInt(id, 10);
  if (!Number.isNaN(n) && n > 0 && String(n) === id.trim()) {
    return { program: "zcg", issueNumber: n };
  }
  throw new Error(`Invalid grant id: ${id}`);
}

export function programLabel(program: GrantProgram): string {
  return program === "zcg" ? "ZCG" : "Coinholder";
}

/** Target repo for creating issues via apply flow (server or client with NEXT_PUBLIC_*). */
export function getIssueRepoSlug(program: GrantProgram = "zcg"): string {
  if (program === "coinholder") {
    return (
      process.env.NEXT_PUBLIC_GITHUB_REPO_COINHOLDER || DEFAULT_COINHOLDER_REPO
    );
  }
  return (
    process.env.NEXT_PUBLIC_GITHUB_REPO ||
    process.env.VITE_GITHUB_REPO ||
    OFFICIAL_ZCG_REPO
  );
}
