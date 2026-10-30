/**
 * iCalendar (RFC 5545) feed of dates grant applicants and coinholders act on:
 * Coinholder retro round milestones and protocol heights (estimated times).
 */
import { RETRO_ROUNDS, type RetroRound } from "@/lib/retroRounds";
import {
  estimateTimeOfHeight,
  NSM_REISSUANCE_HEIGHT,
  NU7_HEIGHT,
  THIRD_HALVING_HEIGHT,
  type ChainRef,
} from "@/lib/fundingStreams";

export interface CalEvent {
  uid: string;
  start: number;
  /** Minutes. */
  duration: number;
  title: string;
  description: string;
  url?: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
const icsDate = (t: number) => {
  const d = new Date(t);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
};
export const escapeText = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Fold to 75 octets per line (RFC 5545 §3.1), never splitting a UTF-8 sequence. */
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74; // continuation lines start with a space
    if (bytes + b > limit) {
      out.push(cur);
      cur = "";
      bytes = 0;
    }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join("\r\n ");
}

export function roundEvents(r: RetroRound, siteUrl: string): CalEvent[] {
  if (r.status !== "scheduled") return [];
  const url = `${siteUrl}/retro`;
  const steps: Array<[string | undefined, string, string]> = [
    [r.submissionsOpen, "submissions open", "Coinholder retro grants: proposals for completed work are accepted from now."],
    [r.submissionDeadline, "submission deadline", "Last moment to submit: FPF GitHub template plus a forum thread in Retroactive Grants."],
    [r.reviewStart, "30-day review starts", "Community review of submitted proposals begins on the forum."],
    [r.votingStart, "coinholder voting opens", "ZEC holders vote from a voting-capable wallet. 420,000 ZEC quorum per proposal."],
    [r.votingEnd, "coinholder voting closes", "Voting ends; FPF publishes results afterwards."],
  ];
  return steps
    .filter(([at]) => at)
    .map(([at, what, description], i) => ({
      uid: `retro-${r.id}-${i}@zgrantshub.com`,
      start: Date.parse(at!),
      duration: 30,
      title: `Retro ${r.label}: ${what}`,
      description: `${description} Dates from FPF: ${r.sources[0]}`,
      url,
    }));
}

export function protocolEvents(ref: ChainRef, siteUrl: string): CalEvent[] {
  const url = `${siteUrl}/funding-streams`;
  const est = "Estimated from the current chain height at target block spacing.";
  return [
    [NU7_HEIGHT, "nu7", "Zcash NU7 activates", "25-second blocks; subsidy per block divided by three; 60% of fees removed from circulation."],
    [THIRD_HALVING_HEIGHT, "halving-3", "Zcash third halving; ZCG and Coinholder streams end", "Subsidy halves and the 8% / 12% funding streams end unless changed."],
    [NSM_REISSUANCE_HEIGHT, "nsm", "NSM reissuance begins", "ZEC removed from circulation starts flowing back through block rewards (ZIP 237)."],
  ].map(([h, key, title, body]) => ({
    uid: `protocol-${key}@zgrantshub.com`,
    start: estimateTimeOfHeight(h as number, ref),
    duration: 60,
    title: title as string,
    description: `${body} Height ${(h as number).toLocaleString("en-US")}. ${est}`,
    url,
  }));
}

export function buildIcs(events: CalEvent[], now: number = Date.now()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Zcash Grants Hub//Deadlines//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Zcash grants & protocol dates",
    "REFRESH-INTERVAL;VALUE=DURATION:PT12H",
    "X-PUBLISHED-TTL:PT12H",
  ];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTAMP:${icsDate(now)}`,
      `DTSTART:${icsDate(e.start)}`,
      `DTEND:${icsDate(e.start + e.duration * 60_000)}`,
      `SUMMARY:${escapeText(e.title)}`,
      `DESCRIPTION:${escapeText(e.description)}`,
      ...(e.url ? [`URL:${e.url}`] : []),
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

export function allEvents(ref: ChainRef, siteUrl: string): CalEvent[] {
  return [...RETRO_ROUNDS.flatMap((r) => roundEvents(r, siteUrl)), ...protocolEvents(ref, siteUrl)].sort(
    (a, b) => a.start - b.start
  );
}
