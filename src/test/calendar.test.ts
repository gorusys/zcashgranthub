import { describe, expect, it } from "vitest";
import { allEvents, buildIcs, escapeText, foldLine } from "@/lib/calendar";

const ref = { height: 3_535_681, time: Date.parse("2026-10-30T08:50:11Z") };

describe("calendar feed", () => {
  const events = allEvents(ref, "https://zgrantshub.com");
  const ics = buildIcs(events, Date.parse("2026-10-30T00:00:00Z"));
  const unfolded = ics.replace(/\r\n /g, "");

  it("includes the Q4 2026 deadline at the FPF time, in UTC", () => {
    expect(unfolded).toContain("SUMMARY:Retro Q4 2026: submission deadline\r\nDESCRIPTION:");
    expect(ics).toContain("DTSTART:20261113T200000Z");
  });

  it("skips postponed rounds and adds protocol milestones", () => {
    expect(ics).not.toContain("Q2 2026");
    expect(ics).toContain("UID:protocol-nu7@zgrantshub.com");
    expect(events.filter((e) => e.uid.startsWith("protocol-"))).toHaveLength(3);
  });

  it("is well-formed: CRLF, balanced blocks, unique UIDs, escaped text, folded lines", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.split("BEGIN:VEVENT").length).toBe(ics.split("END:VEVENT").length);
    const uids = ics.match(/^UID:.*$/gm)!;
    expect(new Set(uids).size).toBe(uids.length);
    expect(unfolded).toContain("GitHub template plus a forum thread in Retroactive Grants.");
    expect(unfolded).toMatch(/Height 6\\,132\\,390/);
    for (const line of ics.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });

  it("folds without splitting multi-byte characters", () => {
    const folded = foldLine("SUMMARY:" + "ⓩ".repeat(40));
    expect(folded.split("\r\n ").join("")).toBe("SUMMARY:" + "ⓩ".repeat(40));
    for (const l of folded.split("\r\n")) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
  });

  it("escapes RFC 5545 special characters", () => {
    expect(escapeText("a;b,c\\d\ne")).toBe("a\\;b\\,c\\\\d\\ne");
  });
});
