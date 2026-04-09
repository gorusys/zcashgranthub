/**
 * Match GitHub grant issue titles to ZecHub DAO DAO proposal titles.
 * Proposals often omit issue URLs; titles still align on project name + region.
 */

const MIN_NORMALIZED_LEN = 6;
const MIN_SCORE = 0.72;

/** Strip grant prefix, parentheticals (dates, subtitles), lowercase, alnum tokens. */
export function normalizeGrantTitleForMatch(title: string): string {
  let t = title
    .replace(/^Grant\s+Application\s*[-–]\s*/i, "")
    .trim();
  t = t.replace(/\s*\([^)]*\)/g, " ");
  t = t.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  return t;
}

function significantWords(normalized: string): string[] {
  return normalized.split(" ").filter((w) => w.length > 2);
}

/**
 * Score 0–1. High when normalized titles overlap strongly (substring or token F1).
 */
export function grantTitleMatchScore(
  grantTitle: string,
  proposalTitle: string
): number {
  const g = normalizeGrantTitleForMatch(grantTitle);
  const p = normalizeGrantTitleForMatch(proposalTitle);
  if (g.length < MIN_NORMALIZED_LEN || p.length < MIN_NORMALIZED_LEN) return 0;
  if (g === p) return 1;
  if (p.includes(g) || g.includes(p)) return 0.95;

  const wg = significantWords(g);
  const wp = significantWords(p);
  if (wg.length === 0 || wp.length === 0) return 0;

  const wps = new Set(wp);
  let inter = 0;
  for (const w of wg) {
    if (wps.has(w)) inter++;
  }
  if (inter === 0) return 0;

  const precision = inter / wg.length;
  const recall = inter / wp.length;
  if (precision === 0 || recall === 0) return 0;
  return (2 * precision * recall) / (precision + recall);
}

export function grantTitlesMatch(grantTitle: string, proposalTitle: string): boolean {
  return grantTitleMatchScore(grantTitle, proposalTitle) >= MIN_SCORE;
}
