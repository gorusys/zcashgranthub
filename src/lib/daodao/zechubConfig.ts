/**
 * ZecHub DAO on DAO DAO (Juno mainnet).
 * Verified via https://indexer.daodao.zone/juno-1/contract/.../daoCore/dumpState
 * and https://zechub.wiki/dao
 */
export const ZECHUB_CHAIN_ID = "juno-1";

/** DAO core (dao-core) contract */
export const ZECHUB_DAO_CORE =
  process.env.NEXT_PUBLIC_ZECHUB_DAO_CORE ??
  "juno1nktrulhakwm0n3wlyajpwxyg54n39xx4y8hdaqlty7mymf85vweq7m6t0y";

/** Single-choice proposal module (prefix A) */
export const ZECHUB_PROPOSAL_MODULE_SINGLE =
  process.env.NEXT_PUBLIC_ZECHUB_PROPOSAL_MODULE_SINGLE ??
  "juno14futcfehnc8fn4nz6gtm25svn05mzz09ju8rtj0jvven2hpxj85s0q8a55";

export const DAO_DAO_INDEXER_BASE =
  process.env.NEXT_PUBLIC_DAO_DAO_INDEXER_BASE ?? "https://indexer.daodao.zone";

export const ZECHUB_PROPOSAL_PREFIX = "A";

export function zechubDaoDaodaoUrl(): string {
  return `https://daodao.zone/dao/${ZECHUB_DAO_CORE}`;
}

export function zechubProposalDaodaoUrl(proposalId: number): string {
  return `https://daodao.zone/dao/${ZECHUB_DAO_CORE}/proposals/${ZECHUB_PROPOSAL_PREFIX}${proposalId}`;
}

/** Open DAO DAO’s proposal builder for this DAO (connect wallet there to submit). */
export function zechubDaoCreateProposalUrl(): string {
  return `https://daodao.zone/dao/${ZECHUB_DAO_CORE}/proposals/create`;
}
