import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  queryDaoSummary,
  queryProposal,
  queryReverseProposals,
  resetZechubSourceState,
} from "@/lib/daodao/zechubSource";

const row = (id: number) => ({
  id,
  proposal: {
    title: `P${id}`,
    description: "",
    status: "open",
    votes: { yes: "1", no: "0", abstain: "0" },
  },
});

function respond(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

function decodeSmartQuery(url: string): unknown {
  const encoded = decodeURIComponent(url.split("/smart/")[1]);
  return JSON.parse(atob(encoded));
}

describe("zechubSource", () => {
  const fetchMock = vi.fn<(url: string) => Promise<Response>>();

  beforeEach(() => {
    resetZechubSourceState();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", (input: string) => fetchMock(String(input)));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the indexer when it is healthy", async () => {
    fetchMock.mockImplementation(() => respond([row(5), row(4)]));
    const rows = await queryReverseProposals(2, 6);
    expect(rows.map((r) => r.id)).toEqual([5, 4]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain("reverseProposals?limit=2&startBefore=6");
  });

  it("falls back to a Juno smart query when the indexer returns 530", async () => {
    fetchMock.mockImplementation((url) =>
      url.includes("indexer.daodao.zone")
        ? respond("error code: 1016", 530)
        : respond({ data: { proposals: [row(3)] } })
    );
    const rows = await queryReverseProposals(10, 4);
    expect(rows.map((r) => r.id)).toEqual([3]);
    const chainUrl = fetchMock.mock.calls[1][0];
    expect(decodeSmartQuery(chainUrl)).toEqual({
      reverse_proposals: { limit: 10, start_before: 4 },
    });
  });

  it("skips a failed indexer during the cooldown and tries the next REST endpoint", async () => {
    fetchMock.mockImplementation((url) => {
      if (url.includes("indexer.daodao.zone")) return respond({}, 530);
      if (url.includes("publicnode")) return respond({}, 503);
      return respond({ data: { id: 7, proposal: row(7).proposal } });
    });
    await queryProposal(7);
    fetchMock.mockClear();
    const p = await queryProposal(7);
    expect(p.id).toBe(7);
    expect(fetchMock.mock.calls.some(([u]) => u.includes("indexer.daodao.zone"))).toBe(false);
  });

  it("sums proposal counts across modules for the chain DAO summary", async () => {
    fetchMock.mockImplementation((url) => {
      if (url.includes("indexer.daodao.zone")) return respond({}, 530);
      const q = decodeSmartQuery(url) as Record<string, unknown>;
      if ("dump_state" in q) {
        return respond({
          data: {
            config: { name: "ZecHub" },
            proposal_modules: [{ address: "juno1a" }, { address: "juno1b" }],
          },
        });
      }
      return respond({ data: url.includes("juno1a") ? 189 : 2 });
    });
    expect(await queryDaoSummary()).toEqual({ name: "ZecHub", proposalCount: 191 });
  });

  it("reports both sources when everything is down", async () => {
    fetchMock.mockImplementation(() => respond({}, 530));
    await expect(queryReverseProposals(5)).rejects.toThrow(/indexer 530; Juno RPC unavailable/);
  });
});
