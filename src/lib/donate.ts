/**
 * Donation helpers for the Zcash Grants Hub donation address.
 *
 * The address is a mainnet Unified Address (ZIP-316) carrying Orchard, Sapling and
 * transparent (P2PKH) receivers. Payment requests follow ZIP-321.
 */

export const DONATION_UNIFIED_ADDRESS =
  "u1y46my28ta83edswmw9m3du8dx6ypjnf6wncxhuzy8wzps604wh9t9zwk360nq7xdnkyqpfrp7l6tndmynhagtzn5k857rau743etzgjkpy7l6pj7s6j2f8dct8p7zx7u99254ckntqh8lhlvznxsj87zr8lyy87gvxmmect90y6f63w5aqqmdc29tgfknxlz5vctrmh056smz7hjjd0";

/** Receivers encoded in DONATION_UNIFIED_ADDRESS, most private first. */
export const DONATION_RECEIVERS = ["Orchard", "Sapling", "Transparent"] as const;

export const HUB_REPO_URL = "https://github.com/gorusys/zcashgranthub";

export const DEFAULT_DONATION_MEMO = "Donation to Zcash Grants Hub";

/** ZIP-302 memo field size. */
export const MAX_MEMO_BYTES = 512;

const MAX_ZEC_SUPPLY = 21_000_000;
const ZATOSHIS_PER_ZEC = 100_000_000n;

const BECH32_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const BECH32M_CONST = 0x2bc830a3;
const BECH32_GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

function bech32Polymod(values: number[]): number {
  let chk = 1;
  for (const v of values) {
    const top = chk >>> 25;
    chk = (((chk & 0x1ffffff) << 5) ^ v) >>> 0;
    for (let i = 0; i < 5; i++) {
      if ((top >>> i) & 1) chk = (chk ^ BECH32_GENERATOR[i]) >>> 0;
    }
  }
  return chk;
}

/**
 * Validates the bech32m checksum of a mainnet Unified Address (`u1…`).
 * UAs are exempt from the 90-character bech32 length limit (ZIP-316).
 */
export function isValidMainnetUnifiedAddress(address: string): boolean {
  if (address !== address.toLowerCase()) return false;
  const sep = address.lastIndexOf("1");
  if (sep < 1 || address.slice(0, sep) !== "u") return false;
  const hrp = address.slice(0, sep);
  const data: number[] = [];
  for (const ch of address.slice(sep + 1)) {
    const v = BECH32_CHARSET.indexOf(ch);
    if (v === -1) return false;
    data.push(v);
  }
  if (data.length < 6) return false;
  const expanded = [
    ...Array.from(hrp, (c) => c.charCodeAt(0) >> 5),
    0,
    ...Array.from(hrp, (c) => c.charCodeAt(0) & 31),
  ];
  return bech32Polymod([...expanded, ...data]) === BECH32M_CONST;
}

/** Short fingerprint for visually confirming an address, e.g. `u1y46my2…hjjd0`. */
export function addressFingerprint(address: string, head = 8, tail = 8): string {
  if (address.length <= head + tail) return address;
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}

/**
 * Parses a user-entered ZEC amount into a canonical ZIP-321 decimal string
 * (no trailing zeros, at most 8 decimals). Returns null when invalid or not positive.
 */
export function normalizeZecAmount(input: string): string | null {
  const trimmed = input.trim();
  const match = /^(\d+)(?:\.(\d{0,8}))?$/.exec(trimmed);
  if (!match) return null;
  const whole = BigInt(match[1]);
  const frac = (match[2] ?? "").padEnd(8, "0");
  const zats = whole * ZATOSHIS_PER_ZEC + BigInt(frac);
  if (zats <= 0n || zats > BigInt(MAX_ZEC_SUPPLY) * ZATOSHIS_PER_ZEC) return null;
  const wholeStr = (zats / ZATOSHIS_PER_ZEC).toString();
  const fracStr = (zats % ZATOSHIS_PER_ZEC).toString().padStart(8, "0").replace(/0+$/, "");
  return fracStr ? `${wholeStr}.${fracStr}` : wholeStr;
}

export function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

/** base64url without padding, as required for ZIP-321 `memo` values. */
export function encodeMemoBase64Url(memo: string): string {
  const bytes = new TextEncoder().encode(memo);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export interface PaymentRequestOptions {
  amount?: string | null;
  memo?: string | null;
  label?: string | null;
}

/** Builds a ZIP-321 `zcash:` payment URI. Invalid amounts and oversized memos are omitted. */
export function buildZip321Uri(address: string, opts: PaymentRequestOptions = {}): string {
  const params: string[] = [];
  const amount = opts.amount ? normalizeZecAmount(opts.amount) : null;
  if (amount) params.push(`amount=${amount}`);
  const memo = opts.memo?.trim();
  if (memo && utf8ByteLength(memo) <= MAX_MEMO_BYTES) {
    params.push(`memo=${encodeMemoBase64Url(memo)}`);
  }
  const label = opts.label?.trim();
  if (label) params.push(`label=${encodeURIComponent(label)}`);
  return params.length ? `zcash:${address}?${params.join("&")}` : `zcash:${address}`;
}
