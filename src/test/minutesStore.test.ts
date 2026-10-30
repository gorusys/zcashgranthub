// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { __resetMinutesStoreForTests, getZcgDecisions } from "@/lib/server/minutesStore";

const minutesHtml = (topic: number, outcome: string) =>
  `<ul><li><p><a href="https://forum.zcashcommunity.com/t/proposal/${topic}">Proposal ${topic}</a></p></li><li><p>${outcome}</p></li></ul>`;

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

describe("minutesStore", () => {
  const fetchMock = vi.fn<(url: string) => Promise<Response>>();
  let dir: string;

  beforeEach(() => {
    __resetMinutesStoreForTests();
    dir = mkdtempSync(path.join(os.tmpdir(), "minutes-store-"));
    vi.stubEnv("MINUTES_CACHE_PATH", path.join(dir, "cache.json"));
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers({ shouldAdvanceTime: true, advanceTimeDelta: 50 });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    fetchMock.mockReset();
    rmSync(dir, { recursive: true, force: true });
  });

  const forum = (opts: { page2?: number } = {}) =>
    fetchMock.mockImplementation((url) => {
      if (url.includes("search.json")) {
        if (url.endsWith("page=1"))
          return json({
            topics: [
              { id: 900, title: "Zcash Community Grants Meeting Minutes 10/23/2026", created_at: "2026-10-25T00:00:00Z" },
              { id: 901, title: "Unrelated thread", created_at: "2026-10-24T00:00:00Z" },
            ],
          });
        if (url.endsWith("page=2")) return opts.page2 ? json({}, opts.page2) : json({ topics: [] });
        return json({ topics: [] });
      }
      if (url.endsWith("/t/900.json"))
        return json({ post_stream: { posts: [{ username: "ZCG", cooked: minutesHtml(58103, "Declined") }] } });
      return json({}, 404);
    });

  it("builds decisions from @ZCG minutes topics only", async () => {
    forum();
    const snap = await getZcgDecisions();
    expect(snap.meetings).toBe(1);
    expect(snap.decisions).toMatchObject([{ topicId: 58103, outcome: "declined", meetingDate: "2026-10-23" }]);
    expect(fetchMock.mock.calls.some(([u]) => u.includes("/t/901.json"))).toBe(false);
  });

  it("keeps earlier pages when a later search page is rate-limited", async () => {
    forum({ page2: 429 });
    const snap = await getZcgDecisions();
    expect(snap.decisions).toHaveLength(1);
  });

  it("reports the error on a cold start and backs off instead of retrying every request", async () => {
    fetchMock.mockImplementation(() => json({}, 429));
    await expect(getZcgDecisions()).rejects.toThrow(/429/);
    const calls = fetchMock.mock.calls.length;
    await expect(getZcgDecisions()).rejects.toThrow(/429/);
    expect(fetchMock.mock.calls.length).toBe(calls);
  });

  it("serves the persisted cache after a restart without refetching minutes", async () => {
    forum();
    await getZcgDecisions();
    __resetMinutesStoreForTests();
    fetchMock.mockReset();
    fetchMock.mockImplementation(() => json({}, 500));
    const snap = await getZcgDecisions();
    expect(snap.decisions).toHaveLength(1);
    expect(fetchMock.mock.calls.some(([u]) => u.includes("/t/900.json"))).toBe(false);
  });
});
