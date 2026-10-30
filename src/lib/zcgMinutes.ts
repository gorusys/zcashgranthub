/**
 * Parses ZCG committee meeting minutes (Discourse "cooked" HTML posted by @ZCG)
 * into per-proposal decisions with each member's stated reasoning.
 *
 * Minutes list proposals as <li> items whose own text is a link to the
 * proposal's forum topic, followed by items for the summary, member statements
 * ("Name: …") and a decision line ("Approved", "Declined", "Remains open", …).
 * Both the flat 2026 layout and the older nested layout reduce to that sequence
 * once list items are flattened in document order.
 */

export type ZcgOutcome = "approved" | "declined" | "open" | "unknown";

export interface ZcgStatement {
  member: string;
  text: string;
}

export interface ZcgDecision {
  /** Forum topic id of the proposal discussed. */
  topicId: number;
  title: string;
  forumUrl: string;
  outcome: ZcgOutcome;
  /** Decision line as written, e.g. "Approved (Zerodartz declined)". */
  outcomeText: string;
  summary: string;
  requestedUsd: number | null;
  statements: ZcgStatement[];
  meetingDate: string;
  minutesUrl: string;
  minutesTopicId: number;
}

export interface MinutesMeta {
  minutesTopicId: number;
  minutesUrl: string;
  meetingDate: string;
}

const FORUM_TOPIC_RE =
  /href="https:\/\/forum\.zcashcommunity\.com\/t\/(?:[^"/]*[^"/\d][^"/]*\/)?(\d+)[^"]*"/;

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;|&rsquo;|&lsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&nbsp;/g, " ");

const stripTags = (html: string) =>
  decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

/** Each <li>'s own content (before any nested list or its closing tag), in document order. */
function flattenListItems(html: string): string[] {
  return html
    .split(/<li[^>]*>/i)
    .slice(1)
    .map((seg) => seg.split(/<\/li>|<ul[^>]*>|<ol[^>]*>/i)[0]);
}

export function classifyOutcome(line: string): ZcgOutcome {
  const s = line.trim().toLowerCase();
  if (/^(unanimous(ly)?\s+)?approv/.test(s)) return "approved";
  if (/^(unanimous(ly)?\s+)?(declin|reject)/.test(s)) return "declined";
  if (
    /^(remains? open|too early|tabled|deferred|postponed|pending|kept open|left open|open until|deliberations? continue|vote pending)/.test(s)
  )
    return "open";
  return "unknown";
}

/** "Name: text" or "Name- text" (both appear in the minutes). */
const STATEMENT_RE = /^([A-Za-z][\w.'’]{1,19}(?: [A-Z][\w.'’]{1,19})?)\s*(?::|\s?[-–—])\s+(.+)$/;
const REQUEST_RE = /\$\s?([\d,]+(?:\.\d+)?)\s*(k\b)?/i;

function parseRequested(summary: string): number | null {
  const ctx = summary.match(/(?:request|asking|ask)[^$]{0,60}(\$\s?[\d,]+(?:\.\d+)?\s*k?)/i);
  const m = (ctx ? ctx[1] : summary).match(REQUEST_RE);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  return m[2] ? n * 1000 : n;
}

interface Block {
  topicId: number;
  title: string;
  forumUrl: string;
  lines: string[];
}

export function parseMinutesHtml(html: string, meta: MinutesMeta): ZcgDecision[] {
  const blocks: Block[] = [];
  let current: Block | null = null;

  for (const own of flattenListItems(html)) {
    const text = stripTags(own);
    if (!text) continue;
    const link = own.match(FORUM_TOPIC_RE);
    const anchorText = link ? stripTags(own.match(/<a[^>]*>([\s\S]*?)<\/a>/i)?.[1] ?? "") : "";
    // A proposal heading: the item is (almost) just the link to a forum topic.
    // Decision lines are sometimes links too ("Approved async" → the vote post).
    if (
      link &&
      anchorText &&
      text.length <= anchorText.length + 3 &&
      Number(link[1]) !== meta.minutesTopicId &&
      classifyOutcome(anchorText) === "unknown"
    ) {
      current = {
        topicId: Number(link[1]),
        title: anchorText,
        forumUrl: `https://forum.zcashcommunity.com/t/${link[1]}`,
        lines: [],
      };
      blocks.push(current);
      continue;
    }
    if (current) current.lines.push(text);
  }

  // The same proposal appears in "Key Takeaways" and again in the discussion; merge.
  const merged = new Map<number, ZcgDecision>();
  for (const b of blocks) {
    const statements: ZcgStatement[] = [];
    let outcomeText = "";
    let outcome: ZcgOutcome = "unknown";
    const prose: string[] = [];
    for (const line of b.lines) {
      const cls = classifyOutcome(line);
      const st = cls === "unknown" ? line.match(STATEMENT_RE) : null;
      if (cls !== "unknown" && line.length <= 300) {
        outcome = cls;
        outcomeText = line;
      } else if (st && st[2].length > 1) {
        statements.push({ member: st[1], text: st[2] });
      } else {
        prose.push(line);
      }
    }
    const summary = prose.sort((a, b) => b.length - a.length)[0] ?? "";
    const prev = merged.get(b.topicId);
    if (!prev) {
      merged.set(b.topicId, {
        topicId: b.topicId,
        title: b.title,
        forumUrl: b.forumUrl,
        outcome,
        outcomeText,
        summary,
        requestedUsd: parseRequested(summary),
        statements,
        ...meta,
      });
      continue;
    }
    if (prev.outcome === "unknown" && outcome !== "unknown") {
      prev.outcome = outcome;
      prev.outcomeText = outcomeText;
    }
    if (summary.length > prev.summary.length) {
      prev.summary = summary;
      prev.requestedUsd = parseRequested(summary);
    }
    if (statements.length > prev.statements.length) prev.statements = statements;
  }
  return [...merged.values()];
}

/** Meeting date from a minutes title ("… Minutes 10/23/2026", "… April 27, 2026"), else the post date. */
export function meetingDateFromTitle(title: string, postedAt: string): string {
  const posted = Date.parse(postedAt);
  const m =
    title.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/) ?? null;
  let parsed = NaN;
  if (m) {
    const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    parsed = Date.UTC(year, Number(m[1]) - 1, Number(m[2]));
  } else {
    const words = title.match(/([A-Z][a-z]+ \d{1,2},? \d{4})/);
    if (words) parsed = Date.parse(`${words[1]} UTC`);
  }
  // Guard against typos: the meeting is at most ~5 weeks before the post.
  if (Number.isNaN(parsed) || parsed > posted + 86_400_000 || posted - parsed > 35 * 86_400_000) {
    return new Date(posted).toISOString().slice(0, 10);
  }
  return new Date(parsed).toISOString().slice(0, 10);
}

/** Forum topic id from a URL like https://forum.zcashcommunity.com/t/slug/123[/4]. */
export function forumTopicId(url: string | undefined): number | null {
  const m = url?.match(/forum\.zcashcommunity\.com\/t\/(?:[^/]+\/)?(\d+)/);
  return m ? Number(m[1]) : null;
}

/**
 * Decisions about one grant: matched by the grant's forum topic, or by a close
 * title match when the application doesn't link its forum thread.
 */
export function decisionsForGrant(
  decisions: ZcgDecision[],
  grant: { forumLink?: string; title: string },
  titleScore: (a: string, b: string) => number
): ZcgDecision[] {
  const topic = forumTopicId(grant.forumLink);
  const byTopic = topic == null ? [] : decisions.filter((d) => d.topicId === topic);
  if (byTopic.length > 0) return byTopic;
  return decisions.filter((d) => titleScore(grant.title, d.title) >= 0.85);
}
