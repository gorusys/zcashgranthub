import type { DaoProposalSingleRaw } from "./types";
import {
  DAO_DAO_INDEXER_BASE,
  JUNO_REST_ENDPOINTS,
  ZECHUB_CHAIN_ID,
  ZECHUB_DAO_CORE,
  ZECHUB_PROPOSAL_MODULE_SINGLE,
} from "./zechubConfig";

/**
 * Data access for ZecHub DAO contracts.
 *
 * Primary source is the DAO DAO indexer (cached, fast). When it is unavailable (e.g. Cloudflare
 * 530 / origin down) we fall back to CosmWasm smart queries against public Juno REST (LCD)
 * endpoints, which return the same proposal shape straight from chain state.
 */

const REQUEST_TIMEOUT_MS = 8_000;
/** After an indexer failure, skip it for this long so paginated scans don't pay for it per page. */
const INDEXER_COOLDOWN_MS = 60_000;

let indexerDownUntil = 0;

export interface ReverseProposalRow {
  id: number;
  proposal: DaoProposalSingleRaw["proposal"] & { description: string };
  createdAt?: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function fromIndexer<T>(path: string, params?: Record<string, string>): Promise<T> {
  if (Date.now() < indexerDownUntil) throw new Error("indexer cooling down");
  const url = new URL(`${DAO_DAO_INDEXER_BASE}/${ZECHUB_CHAIN_ID}${path}`);
  for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, v);
  try {
    return await fetchJson<T>(url.toString());
  } catch (e) {
    indexerDownUntil = Date.now() + INDEXER_COOLDOWN_MS;
    throw e;
  }
}

/** CosmWasm smart query, trying each configured Juno REST endpoint in order. */
async function smartQuery<T>(contract: string, msg: object): Promise<T> {
  const encoded = btoa(JSON.stringify(msg));
  const errors: string[] = [];
  for (const base of JUNO_REST_ENDPOINTS) {
    try {
      const body = await fetchJson<{ data: T }>(
        `${base}/cosmwasm/wasm/v1/contract/${contract}/smart/${encodeURIComponent(encoded)}`
      );
      return body.data;
    } catch (e) {
      errors.push(`${new URL(base).host}: ${e instanceof Error ? e.message : "error"}`);
    }
  }
  throw new Error(`Juno RPC unavailable (${errors.join("; ")})`);
}

async function withFallback<T>(
  label: string,
  indexer: () => Promise<T>,
  chain: () => Promise<T>
): Promise<T> {
  let indexerError: unknown;
  try {
    return await indexer();
  } catch (e) {
    indexerError = e;
  }
  try {
    return await chain();
  } catch (chainError) {
    const a = indexerError instanceof Error ? indexerError.message : "error";
    const b = chainError instanceof Error ? chainError.message : "error";
    throw new Error(`${label}: indexer ${a}; ${b}`);
  }
}

/** Newest-first page of single-choice proposals, ids strictly below `startBefore` when set. */
export function queryReverseProposals(
  limit: number,
  startBefore?: number
): Promise<ReverseProposalRow[]> {
  return withFallback(
    "ZecHub proposals",
    async () => {
      const params: Record<string, string> = { limit: String(limit) };
      if (startBefore !== undefined) params.startBefore = String(startBefore);
      const rows = await fromIndexer<ReverseProposalRow[]>(
        `/contract/${ZECHUB_PROPOSAL_MODULE_SINGLE}/daoProposalSingle/reverseProposals`,
        params
      );
      return Array.isArray(rows) ? rows : [];
    },
    async () => {
      const data = await smartQuery<{ proposals: ReverseProposalRow[] }>(
        ZECHUB_PROPOSAL_MODULE_SINGLE,
        { reverse_proposals: { limit, ...(startBefore !== undefined && { start_before: startBefore }) } }
      );
      return data.proposals ?? [];
    }
  );
}

export function queryProposal(proposalId: number): Promise<DaoProposalSingleRaw> {
  return withFallback(
    `ZecHub proposal ${proposalId}`,
    () =>
      fromIndexer<DaoProposalSingleRaw>(
        `/contract/${ZECHUB_PROPOSAL_MODULE_SINGLE}/daoProposalSingle/proposal`,
        { id: String(proposalId) }
      ),
    () =>
      smartQuery<DaoProposalSingleRaw>(ZECHUB_PROPOSAL_MODULE_SINGLE, {
        proposal: { proposal_id: proposalId },
      })
  );
}

export function queryDaoSummary(): Promise<{ name: string; proposalCount: number }> {
  return withFallback(
    "ZecHub DAO state",
    async () => {
      const dump = await fromIndexer<{ config: { name: string }; proposalCount: number }>(
        `/contract/${ZECHUB_DAO_CORE}/daoCore/dumpState`
      );
      return { name: dump.config.name, proposalCount: dump.proposalCount };
    },
    async () => {
      const dump = await smartQuery<{
        config: { name: string };
        proposal_modules: Array<{ address: string }>;
      }>(ZECHUB_DAO_CORE, { dump_state: {} });
      // Match the indexer: total proposals across all of the DAO's proposal modules.
      const counts = await Promise.all(
        dump.proposal_modules.map((m) => smartQuery<number>(m.address, { proposal_count: {} }))
      );
      return {
        name: dump.config.name,
        proposalCount: counts.reduce((sum, n) => sum + n, 0),
      };
    }
  );
}

/** Test hook: reset the indexer circuit breaker. */
export function resetZechubSourceState(): void {
  indexerDownUntil = 0;
}
