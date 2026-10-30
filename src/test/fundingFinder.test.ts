import { describe, expect, it } from "vitest";
import { recommendFunding } from "@/lib/fundingFinder";

const ids = (r: ReturnType<typeof recommendFunding>) => r.map((x) => `${x.id}:${x.fit}`);

describe("recommendFunding", () => {
  it("sends finished software to the coinholder retro program", () => {
    expect(ids(recommendFunding({ stage: "done", size: "medium", kind: "software" }))).toEqual([
      "coinholder:best",
    ]);
  });

  it("sends planned software to ZCG and never to retro", () => {
    const r = recommendFunding({ stage: "planned", size: "large", kind: "software" });
    expect(ids(r)).toEqual(["zcg:best"]);
    expect(r[0].why.some((w) => w.includes("KYC"))).toBe(true);
  });

  it("splits partly finished work across retro and ZCG", () => {
    const r = recommendFunding({ stage: "partly", size: "medium", kind: "software" });
    expect(ids(r)).toEqual(["zcg:good", "coinholder:possible"]);
    expect(r.find((x) => x.id === "coinholder")!.why.join(" ")).toMatch(/disclose both/);
  });

  it("prefers bounties for small content work", () => {
    const r = recommendFunding({ stage: "planned", size: "small", kind: "content" });
    expect(ids(r)[0]).toBe("zechub_bounties:best");
    expect(r.map((x) => x.id)).toContain("zechub_dao");
  });

  it("routes disclosed security work to retro with a security note", () => {
    const r = recommendFunding({ stage: "done", size: "large", kind: "security" });
    expect(ids(r)).toEqual(["coinholder:best"]);
    expect(r[0].why.join(" ")).toMatch(/vulnerability/);
  });

  it("always returns at least one route", () => {
    for (const stage of ["done", "partly", "planned"] as const)
      for (const size of ["small", "medium", "large"] as const)
        for (const kind of ["software", "content", "community", "security", "research"] as const)
          expect(recommendFunding({ stage, size, kind }).length).toBeGreaterThan(0);
  });
});

describe("recommendFunding translations", () => {
  it("renders route text in the requested language", async () => {
    const { translator } = await import("@/i18n/translate");
    const r = recommendFunding({ stage: "planned", size: "large", kind: "software" }, translator("es"));
    expect(r[0].name).toBe("Zcash Community Grants (ZCG)");
    expect(r[0].why).toContain("Financia trabajo planificado o en curso, pagado por hitos.");
    expect(r[0].cta).toBe("Empezar solicitud ZCG");
  });
});
