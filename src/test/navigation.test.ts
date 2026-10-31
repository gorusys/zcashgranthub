// @vitest-environment node
import { readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { navigationGroups, isNavItemActive } from "@/lib/navigation";
import { uiTranslator } from "@/i18n/uiTranslate";

const items = navigationGroups.flatMap((group) => group.items);
const location = (pathname: string, tab?: string, hash = "") => ({ pathname, query: { tab }, asPath: pathname + (tab ? `?tab=${tab}` : "") + hash });
const selected = (pathname: string, tab?: string, hash?: string) => items.filter((item) => isNavItemActive(item, location(pathname, tab, hash))).map((item) => item.href);

function pages(directory: string, prefix = ""): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "api" || entry.name === "auth" || entry.name.startsWith("_") || entry.name.includes("[") || entry.name === "404.tsx") return [];
    const name = `${prefix}/${entry.name}`;
    return entry.isDirectory() ? pages(path.join(directory, entry.name), name) : entry.name.endsWith(".tsx") ? [name.replace(/\/index\.tsx$/, "").replace(/\.tsx$/, "") || "/"] : [];
  });
}

describe("grouped navigation", () => {
  it("covers every public static page, including the legacy Coinholder application destination", () => {
    const destinations = new Set(items.map((item) => item.href.split(/[?#]/)[0]));
    for (const page of pages("pages")) expect(destinations.has(page === "/apply/coinholder" ? "/apply" : page), page).toBe(true);
    expect(new Set(items.map((item) => item.href)).size).toBe(items.length);
  });

  it("selects one application or personal dashboard tab at a time", () => {
    expect(selected("/apply")).toEqual(["/apply"]);
    expect(selected("/apply", "coinholder")).toEqual(["/apply?tab=coinholder"]);
    expect(selected("/apply", "zechub")).toEqual(["/apply?tab=zechub"]);
    expect(selected("/apply/coinholder")).toEqual(["/apply?tab=coinholder"]);
    expect(selected("/dashboard")).toEqual(["/dashboard"]);
    expect(selected("/dashboard", "milestones")).toEqual(["/dashboard?tab=milestones"]);
    expect(selected("/dashboard", "notifications")).toEqual(["/dashboard?tab=notifications"]);
  });

  it("marks parent lists for detail routes without marking the DAO guide as the proposal list", () => {
    expect(selected("/grants/[id]")).toEqual(["/grants"]);
    expect(selected("/zechub/proposals/[id]")).toEqual(["/zechub/proposals"]);
    expect(selected("/zechub/proposals/guide")).toEqual(["/zechub/proposals/guide"]);
    expect(selected("/donate", undefined, "#contribute")).toEqual(["/donate#contribute"]);
    expect(selected("/donate")).toEqual(["/donate"]);
  });

  it.each(["es", "pt-BR"])("translates every group and link into %s", (locale) => {
    const tx = uiTranslator(locale);
    for (const group of navigationGroups) {
      expect(tx(group.label), group.label).not.toBe(group.label);
      for (const item of group.items) expect(tx(item.label), item.label).not.toBe(item.label);
    }
  });
});
