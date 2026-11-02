import { describe, expect, it } from "vitest";
import { localizedUrl, pageMetadata, SEO_LOCALES, seoPath, sitemapPaths, sitemapXml } from "@/lib/seo";
import { uiTranslator } from "@/i18n/uiTranslate";

describe("SEO URL policy", () => {
  it("uses self-canonical locale URLs and strips tracking, filters and fragments", () => {
    expect(localizedUrl("/grants/?utm_source=discord#results", "es")).toBe("https://zgrantshub.com/es/grants");
    expect(localizedUrl("/", "pt-BR")).toBe("https://zgrantshub.com/pt-BR");
    expect(localizedUrl("//example.com/path")).toBe("https://zgrantshub.com/example.com/path");
    expect(localizedUrl("/")).toBe("https://zgrantshub.com/");
  });
  it("canonicalizes legacy applications and concrete detail IDs", () => {
    expect(seoPath("/apply/coinholder", {})).toBe("/apply");
    expect(seoPath("/grants/[id]", { id: "zcg-42" })).toBe("/grants/zcg-42");
    expect(seoPath("/grants/[id]", {})).toBeNull();
    expect(seoPath("/grants/[id]", { id: ["a", "b"] })).toBeNull();
    expect(seoPath("/grants/[id]", { id: "bad/id" })).toBe("/grants/bad%2Fid");
  });
  it("lists only public canonical pages with reciprocal locale alternates", () => {
    expect(sitemapPaths).not.toContain("/dashboard");
    expect(sitemapPaths).not.toContain("/auth/github/callback");
    expect(sitemapPaths).not.toContain("/404");
    expect(sitemapPaths.some(path => path.includes("["))).toBe(false);
    const xml = sitemapXml();
    expect(xml.match(/<url>/g)).toHaveLength(sitemapPaths.length * SEO_LOCALES.length);
    for (const path of sitemapPaths) for (const locale of SEO_LOCALES) {
      expect(xml).toContain(`<loc>${localizedUrl(path, locale)}</loc>`);
      expect(xml).toContain(`hreflang="${locale}" href="${localizedUrl(path, locale)}"`);
    }
    expect(xml).not.toContain("lastmod"); // Do not invent modification dates.
  });
  it("localizes descriptions for all indexable static pages", () => {
    for (const locale of ["es", "pt-BR"]) {
      const tx = uiTranslator(locale);
      for (const path of sitemapPaths) expect(tx(pageMetadata[path].description), `${locale} ${path}`).not.toBe(pageMetadata[path].description);
    }
  });
});
