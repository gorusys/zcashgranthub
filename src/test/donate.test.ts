import { describe, it, expect } from "vitest";
import {
  DONATION_UNIFIED_ADDRESS,
  MAX_MEMO_BYTES,
  addressFingerprint,
  buildZip321Uri,
  encodeMemoBase64Url,
  isValidMainnetUnifiedAddress,
  normalizeZecAmount,
} from "@/lib/donate";

describe("isValidMainnetUnifiedAddress", () => {
  it("accepts the configured donation address", () => {
    expect(isValidMainnetUnifiedAddress(DONATION_UNIFIED_ADDRESS)).toBe(true);
  });

  it("rejects a single-character typo", () => {
    const last = DONATION_UNIFIED_ADDRESS.at(-1) === "q" ? "p" : "q";
    const typo = DONATION_UNIFIED_ADDRESS.slice(0, -1) + last;
    expect(isValidMainnetUnifiedAddress(typo)).toBe(false);
  });

  it("rejects testnet, mixed-case and non-bech32 input", () => {
    expect(isValidMainnetUnifiedAddress("utest1" + DONATION_UNIFIED_ADDRESS.slice(2))).toBe(false);
    expect(isValidMainnetUnifiedAddress(DONATION_UNIFIED_ADDRESS.toUpperCase())).toBe(false);
    expect(isValidMainnetUnifiedAddress("u1bio")).toBe(false);
  });
});

describe("normalizeZecAmount", () => {
  it.each([
    ["1", "1"],
    ["1.50000000", "1.5"],
    ["0.00000001", "0.00000001"],
    ["007.10", "7.1"],
    [" 2. ", "2"],
  ])("normalizes %j to %j", (input, expected) => {
    expect(normalizeZecAmount(input)).toBe(expected);
  });

  it.each(["", "0", "0.0", "-1", "1e3", "1.123456789", "abc", "21000000.00000001"])(
    "rejects %j",
    (input) => {
      expect(normalizeZecAmount(input)).toBeNull();
    }
  );
});

describe("encodeMemoBase64Url", () => {
  it("encodes UTF-8 without padding or URL-unsafe characters", () => {
    expect(encodeMemoBase64Url("Thank you for your purchase")).toBe(
      "VGhhbmsgeW91IGZvciB5b3VyIHB1cmNoYXNl"
    );
    expect(encodeMemoBase64Url("ü?>")).toBe("w7w_Pg");
  });
});

describe("buildZip321Uri", () => {
  it("returns a bare URI when no options are set", () => {
    expect(buildZip321Uri(DONATION_UNIFIED_ADDRESS)).toBe(`zcash:${DONATION_UNIFIED_ADDRESS}`);
  });

  it("includes normalized amount, memo and label", () => {
    expect(
      buildZip321Uri("u1abc", { amount: "0.50", memo: "hi", label: "Zcash Grants Hub" })
    ).toBe("zcash:u1abc?amount=0.5&memo=aGk&label=Zcash%20Grants%20Hub");
  });

  it("drops invalid amounts and oversized memos", () => {
    expect(
      buildZip321Uri("u1abc", { amount: "-1", memo: "x".repeat(MAX_MEMO_BYTES + 1) })
    ).toBe("zcash:u1abc");
  });
});

describe("addressFingerprint", () => {
  it("keeps head and tail", () => {
    expect(addressFingerprint(DONATION_UNIFIED_ADDRESS)).toBe("u1y46my2…mz7hjjd0");
  });
});
