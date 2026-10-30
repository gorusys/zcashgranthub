// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { __resetGitHubCacheForTests } from "@/lib/github";
import {
  __resetGrantsStoreForTests,
  getGrantDetail,
  getGrantsSnapshot,
  SNAPSHOT_TTL_MS,
} from "@/lib/server/grantsStore";

const issue = (number: number, title = `Grant Application - Project ${number}`) => ({
  number,
  title,
  body: "### Category\n\nInfrastructure\n",
  state: "open",
  labels: [{ id: 1, name: "Grant Application", color: "fff" }],
  user: { login: "alice", avatar_url: "", html_url: "" },
  assignees: [],
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
  html_url: `https://github.com/x/y/issues/${number}`,
});

function respond(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

describe("grantsStore", () => {
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();

  let dir: string;
  let snapshotFile: string;

  beforeEach(() => {
    __resetGrantsStoreForTests();
    __resetGitHubCacheForTests();
    dir = mkdtempSync(path.join(os.tmpdir(), "grants-store-"));
    snapshotFile = path.join(dir, "snapshot.json");
    vi.stubEnv("GRANTS_SNAPSHOT_PATH", snapshotFile);
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("NEXT_PUBLIC_GITHUB_REPO_COINHOLDER_DISABLED", "1");
    vi.stubEnv("GITHUB_API_TOKEN", "server-token");
    vi.useFakeTimers();
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    fetchMock.mockReset();
  });

  it("fetches once and serves the cached snapshot within the TTL", async () => {
    fetchMock.mockImplementation((url) =>
      respond(url.includes("state=open") ? [issue(1), issue(2)] : [])
    );
    const a = await getGrantsSnapshot();
    const b = await getGrantsSnapshot();
    expect(a.grants.map((g) => g.id)).toEqual(["zcg-1", "zcg-2"]);
    expect(b.stale).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2); // open + closed, once
  });

  it("sends the server token, never a public one", async () => {
    vi.stubEnv("NEXT_PUBLIC_GITHUB_TOKEN", "leaky");
    fetchMock.mockImplementation(() => respond([]));
    await getGrantsSnapshot();
    const headers = fetchMock.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer server-token");
  });

  it("serves stale data and keeps it when the refresh fails", async () => {
    fetchMock.mockImplementation((url) =>
      respond(url.includes("state=open") ? [issue(1)] : [])
    );
    await getGrantsSnapshot();

    vi.advanceTimersByTime(SNAPSHOT_TTL_MS + 1);
    fetchMock.mockImplementation(() => respond({ message: "down" }, 500));
    const stale = await getGrantsSnapshot();
    expect(stale.stale).toBe(true);
    expect(stale.grants).toHaveLength(1);

    await vi.runAllTimersAsync();
    const after = await getGrantsSnapshot();
    expect(after.grants).toHaveLength(1);
  });

  it("propagates the error when there is no snapshot yet", async () => {
    fetchMock.mockImplementation(() => respond({}, 403));
    await expect(getGrantsSnapshot()).rejects.toThrow(/rate limit/);
  });

  it("returns grant detail with comments and caches it", async () => {
    fetchMock.mockImplementation((url) => {
      if (url.includes("/comments")) {
        return respond([
          { id: 9, user: { login: "bob", avatar_url: "", html_url: "" }, body: "hi", created_at: "2026-01-03T00:00:00Z" },
        ]);
      }
      return respond({
        ...issue(5),
        repository_url: "https://api.github.com/repos/x/y",
      });
    });
    const g = await getGrantDetail("5");
    expect(g.id).toBe("zcg-5");
    expect(g.sourceRepo).toBe("x/y");
    expect(g.comments).toHaveLength(1);
    await getGrantDetail("zcg-5");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("restores the last good snapshot from disk after a restart", async () => {
    vi.useRealTimers();
    fetchMock.mockImplementation((url) =>
      respond(url.includes("state=open") ? [issue(7)] : [])
    );
    await getGrantsSnapshot();
    await vi.waitFor(() => expect(existsSync(snapshotFile)).toBe(true));

    __resetGrantsStoreForTests();
    fetchMock.mockReset();
    fetchMock.mockImplementation(() => respond({}, 403));
    const restored = await getGrantsSnapshot();
    expect(restored.grants.map((g) => g.id)).toEqual(["zcg-7"]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("revalidates with ETags and reuses the body on 304", async () => {
    let calls = 0;
    fetchMock.mockImplementation((url, init) => {
      calls++;
      const h = (init?.headers ?? {}) as Record<string, string>;
      if (h["If-None-Match"] === '"v1"') return Promise.resolve(new Response(null, { status: 304 }));
      const body = url.includes("state=open") ? [issue(3)] : [];
      return Promise.resolve(
        new Response(JSON.stringify(body), { status: 200, headers: { etag: '"v1"' } })
      );
    });
    await getGrantsSnapshot();
    vi.advanceTimersByTime(SNAPSHOT_TTL_MS + 1);
    await getGrantsSnapshot();
    await vi.runAllTimersAsync();
    const after = await getGrantsSnapshot();
    expect(calls).toBe(4);
    expect(after.grants.map((g) => g.id)).toEqual(["zcg-3"]);
  });
});
