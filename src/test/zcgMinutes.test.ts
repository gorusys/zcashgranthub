import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  classifyOutcome,
  forumTopicId,
  meetingDateFromTitle,
  parseMinutesHtml,
} from "@/lib/zcgMinutes";

const fixture = (id: number) =>
  readFileSync(path.join(__dirname, "fixtures", `zcg-minutes-${id}.html`), "utf8");
const meta = (id: number, date: string) => ({
  minutesTopicId: id,
  minutesUrl: `https://forum.zcashcommunity.com/t/${id}`,
  meetingDate: date,
});

describe("parseMinutesHtml: 2026 flat layout (10/23/2026)", () => {
  const d = parseMinutesHtml(fixture(58488), meta(58488, "2026-10-23"));
  const byId = new Map(d.map((x) => [x.topicId, x]));

  it("finds every proposal once, with a decision", () => {
    expect(d.length).toBeGreaterThanOrEqual(20);
    expect(new Set(d.map((x) => x.topicId)).size).toBe(d.length);
    expect(d.filter((x) => x.outcome === "unknown")).toEqual([]);
  });

  it("captures outcome, request, summary and each member's reasoning", () => {
    const bridge = byId.get(58103)!;
    expect(bridge.outcome).toBe("declined");
    expect(bridge.requestedUsd).toBe(38000);
    expect(bridge.summary).toMatch(/Private Receive Bridge/);
    expect(bridge.statements.map((s) => s.member)).toEqual(
      expect.arrayContaining(["Artkor", "Hanh", "Paul", "Gguy", "Zerodartz"])
    );
    expect(bridge.statements.find((s) => s.member === "Hanh")!.text).toMatch(/PIR/);
  });

  it("keeps dissent noted in the decision line", () => {
    const konclave = byId.get(58165)!;
    expect(konclave.outcome).toBe("approved");
    expect(konclave.outcomeText).toMatch(/Zerodartz declined/);
    expect(byId.get(58172)!.outcome).toBe("open");
  });
});

describe("parseMinutesHtml: older nested layout (2/3/2025)", () => {
  const d = parseMinutesHtml(fixture(50257), meta(50257, "2025-02-03"));
  const byId = new Map(d.map((x) => [x.topicId, x]));

  it("reads free-text outcomes and statements", () => {
    const nigeria = byId.get(50106)!;
    expect(nigeria.outcome).toBe("approved");
    expect(nigeria.requestedUsd).toBe(9600);
    expect(nigeria.statements.map((s) => s.member)).toEqual(
      expect.arrayContaining(["GGuy", "Brian", "Artkor", "Zerodartz", "Jason"])
    );
    expect(byId.get(50204)!.outcome).toBe("open");
  });

  it("does not treat links inside statements as proposals", () => {
    expect(byId.has(50132)).toBe(false);
  });
});

describe("helpers", () => {
  it("classifies decision lines", () => {
    expect(classifyOutcome("Approved (Zerodartz declined)")).toBe("approved");
    expect(classifyOutcome("Unanimous approval. Monthly updates.")).toBe("approved");
    expect(classifyOutcome("Declined async")).toBe("declined");
    expect(classifyOutcome("Too early to vote.")).toBe("open");
    expect(classifyOutcome("Unanimous rejection.")).toBe("declined");
    expect(classifyOutcome("Rejected.")).toBe("declined");
    expect(classifyOutcome("Deliberations continue.")).toBe("open");
    expect(classifyOutcome("Vote pending information from applicant.")).toBe("open");
    expect(classifyOutcome("Applicant requests $38,000")).toBe("unknown");
  });

  it("reads meeting dates from titles, falling back to the post date", () => {
    expect(meetingDateFromTitle("Zcash Community Grants Meeting Minutes 10/23/2026", "2026-10-25T10:00:00Z")).toBe("2026-10-23");
    expect(meetingDateFromTitle("Zcash Community Grants Meeting Minutes 2/3/25", "2025-02-05T10:00:00Z")).toBe("2025-02-03");
    expect(meetingDateFromTitle("Zcash Community Grants Meeting Minutes April 27, 2026", "2026-04-30T10:00:00Z")).toBe("2026-04-27");
    expect(meetingDateFromTitle("Minutes 1/1/2019", "2026-04-30T10:00:00Z")).toBe("2026-04-30");
  });

  it("extracts forum topic ids", () => {
    expect(forumTopicId("https://forum.zcashcommunity.com/t/zocialworld/58033/5")).toBe(58033);
    expect(forumTopicId("https://forum.zcashcommunity.com/t/58033")).toBe(58033);
    expect(forumTopicId("")).toBeNull();
  });
});

describe("parseMinutesHtml: layout variants", () => {
  const html = `
<ul>
<li><p><a href="https://forum.zcashcommunity.com/t/formal-verification/55069">Formal Verification of Halo 2</a></p>
<ul><li><p>Requesting <strong>$201,600</strong> for 18 months of work.</p>
<ul>
<li><p>Artkor- The work must be validated by a recognized expert.</p></li>
<li><p>hanh: Supportive in principle, but unsure about background.</p></li>
<li><p><strong>Declined async</strong>- The committee decided to reject this proposal.</p></li>
</ul></li></ul></li>
<li><p><a href="https://forum.zcashcommunity.com/t/zcash-network-school/55269">Zcash Network School</a></p>
<ul><li><a href="https://forum.zcashcommunity.com/t/zcash-network-school/55269/4">Approved async</a></li></ul></li>
</ul>`;
  const d = parseMinutesHtml(html, meta(55000, "2026-06-08"));
  const byId = new Map(d.map((x) => [x.topicId, x]));

  it("reads hyphen and lowercase statements and explained decisions", () => {
    const fv = byId.get(55069)!;
    expect(fv.outcome).toBe("declined");
    expect(fv.outcomeText).toMatch(/committee decided to reject/);
    expect(fv.requestedUsd).toBe(201600);
    expect(fv.statements.map((s) => s.member)).toEqual(["Artkor", "hanh"]);
  });

  it("treats a linked decision line as the decision, not a new proposal", () => {
    expect(d).toHaveLength(2);
    expect(byId.get(55269)!.outcome).toBe("approved");
  });
});
