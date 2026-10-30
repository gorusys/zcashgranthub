import { describe, expect, it } from "vitest";
import en from "@/i18n/messages/en";
import es from "@/i18n/messages/es";
import ptBR from "@/i18n/messages/pt-BR";
import { translator } from "@/i18n";

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("i18n", () => {
  it.each([
    ["es", es],
    ["pt-BR", ptBR],
  ])("%s has exactly the English keys, with the same placeholders, and no blanks", (_, msgs) => {
    expect(Object.keys(msgs).sort()).toEqual(Object.keys(en).sort());
    for (const [k, v] of Object.entries(en)) {
      const tr = (msgs as Record<string, string>)[k];
      expect(tr.trim(), k).not.toBe("");
      expect(placeholders(tr), k).toEqual(placeholders(v));
    }
  });

  it("interpolates, falls back to English for unknown locales, and leaves unknown vars intact", () => {
    expect(translator("es")("bounties.daysAgo", { n: 3 })).toBe("hace 3 días");
    expect(translator("fr")("nav.grants")).toBe("Grants");
    expect(translator("en")("updates.seeAll", {})).toBe("See all {n} updates");
  });
});
