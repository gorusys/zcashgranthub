// Run against a local dev server: I18N_BASE_URL=http://127.0.0.1:3080 node scripts/i18n/smoke.mjs
import fs from "node:fs";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { chromium } from "@playwright/test";
const require = createRequire(import.meta.url);
const dict = JSON.parse(fs.readFileSync("src/i18n/messages/ui.json", "utf8"));
await build({ entryPoints: ["src/lib/zcgSheetParsers.ts"], outfile: "/tmp/zcash-i18n-parsers.cjs", bundle: true, platform: "node", format: "cjs", logLevel: "silent" });
const parsers = require("/tmp/zcash-i18n-parsers.cjs");
const emptyDashboard = { metrics: { "USD value of grant milestones paid out so far:": "$21,919,943", "USD value of current holdings:": "$123,325,958" }, status: "OK", blockHeight: "3,535,908", blockTime: "30 Oct 2026 13:42:24", zecUsdPriceDisplay: "$1,236.41", sensitivityCurrent: [], sensitivityWithReceivable: [] };
const sheet = { sourceUrl: "https://docs.google.com/spreadsheets/", fetchedAt: "2026-10-30T13:42:24Z", zcg: emptyDashboard, coinholder: emptyDashboard };
for (const [key, parser] of Object.entries({ inputs: "parseInputsCsv", zcgGrants: "parseZcgGrantsCsv", icPayouts: "parseIcPayoutsCsv", coinholderGrants: "parseCoinholderGrantsCsv", liquidity: "parseLiquidityCsv", discBudget2026: "parseDiscBudgetCsv", stipend: "parseStipendCsv", zcgFundsDistribution: "parseFundsDistributionCsv", coinholderFundsDistribution: "parseFundsDistributionCsv", zcgAllGrantsTracking: "parseZcgTrackingCsv", coinholderAllGrantsTracking: "parseCoinholderTrackingCsv" })) sheet[key] = parsers[parser]("");
const grant = {
  id: "zcg-1", program: "zcg", sourceRepo: "ZcashCommunityGrants/zcashcommunitygrants", issueNumber: 1, labels: ["Grant Application"],
  title: "Source title unchanged", summary: "Source summary unchanged", description: "Original description", applicant: "Source applicant", applicantAvatar: "", githubUsername: "i18n-audit", category: "Wallets", status: "ACTIVE", amount: 50000, amountPaid: 10000,
  submittedDate: "2026-10-01T10:00:00Z", lastUpdated: "2026-10-29T10:00:00Z", githubLink: "https://github.com/example/repo/issues/1", forumLink: "https://forum.zcashcommunity.com/t/1",
  problem: "", solution: "", solutionFormat: "", dependencies: "", technicalApproach: "", upstreamMerge: "", milestones: [{ number: 1, amount: 50000, dueDate: "2026-12-01", status: "Pending", userStories: [], deliverables: [], acceptanceCriteria: "" }], milestonesCompleted: 0, totalMilestones: 1,
  teamLead: { name: "Source applicant", role: "", background: "", responsibilities: "" }, teamMembers: [], budget: { hardware: 0, services: 0, compensation: 50000, total: 50000 }, risks: { implementation: "", sideEffects: "", successMetrics: "" }, comments: [], documents: [], committeeMembers: [],
};
const proposal = { id: 1, title: "Source proposal unchanged", description: "Original proposal description", status: "in_voting", rawStatus: "open", votes: { yes: 10, no: 2, abstain: 1 }, votePercent: { yes: 77, no: 15, abstain: 8 }, totalVotes: 13, expiresAtIso: "2026-11-10T10:00:00Z", daodaoUrl: "https://daodao.zone/" };
const routes = ["/", "/grants", `/grants/${grant.id}`, "/apply", "/apply/coinholder", "/dashboard", "/decisions", "/retro", "/analytics", "/donate", "/projects", "/funding-streams", "/find-funding", "/bounties", "/forum/discussions", "/developers", "/zechub/proposals", "/zechub/proposals/1", "/zechub/proposals/guide", "/auth/github/callback?error=access_denied", "/missing-i18n-page"];
async function untranslatedCopy(page, locale) {
  if (locale === "en") return [];
  return page.locator("main").evaluate((main, { dictionary, index }) => {
    const texts = [...main.querySelectorAll("*")].filter((el) => el.children.length === 0 && el.getClientRects().length).map((el) => el.textContent.replace(/\s+/g, " ").trim());
    return [...new Set(texts.filter((text) => dictionary[text] && dictionary[text][index] !== text))];
  }, { dictionary: dict, index: locale === "es" ? 0 : 1 });
}
const browser = await chromium.launch({ headless: true });
const base = process.env.I18N_BASE_URL || "http://127.0.0.1:3080";
const issues = [];
try {
  for (const locale of ["en", "es", "pt-BR"]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.hostname === "api.coingecko.com") return route.fulfill({ json: { zcash: { usd: 1236.41, usd_24h_change: 2 } } });
      if (url.origin !== new URL(base).origin) return route.abort();
      if (!url.pathname.startsWith("/api/")) return route.continue();
      const p = url.pathname;
      let body = {};
      if (p === "/api/grants") body = { grants: [grant], fetchedAt: sheet.fetchedAt, stale: false };
      else if (p.startsWith("/api/grants/")) body = { grant };
      else if (p === "/api/zcg/public-spreadsheet") body = sheet;
      else if (p === "/api/zcg/decisions") body = { decisions: [], total: 0, meetings: 10, listedAt: sheet.fetchedAt };
      else if (p === "/api/projects") body = { projects: [], core: [], fetchedAt: sheet.fetchedAt };
      else if (p === "/api/opportunities") body = { items: [], errors: {} };
      else if (p === "/api/daodao/dao-meta") body = { dao: { name: "ZecHub DAO", proposalCount: 1, chainId: "juno-1", daoCoreAddress: "juno1test" } };
      else if (p === "/api/daodao/proposals-list") body = { items: [{ id: 1, proposal: { ...proposal, status: "open", votes: { yes: "10", no: "2", abstain: "1" } } }], nextStartBefore: null };
      else if (p === "/api/daodao/proposal") body = { proposal };
      else if (p.startsWith("/api/related/")) body = { related: [] };
      else if (p === "/api/repos") body = { stats: {} };
      else if (p === "/api/chain/tip") body = { height: 3535908, time: Date.parse(sheet.fetchedAt), source: "live" };
      else if (p === "/api/forum/retro-announcements") body = { announcements: [] };
      else if (p === "/api/forum/community-grants-topics") body = { topics: [], page: 1, hasMore: false };
      return route.fulfill({ json: body });
    });
    const page = await context.newPage();
    let currentPath = "";
    page.on("pageerror", (error) => { console.error("PAGE ERROR", locale, currentPath, error.message); issues.push(`${locale}${currentPath}: ${error.message}`); });
    page.on("console", (msg) => { if (msg.type() === "error" && /hydration|did not match|cannot be a descendant/i.test(msg.text())) issues.push(`${locale}${currentPath}: ${msg.text()}`); });
    for (const route of routes) {
      currentPath = route;
      await page.goto(base + (locale === "en" ? "" : `/${locale}`) + route, { waitUntil: "networkidle", timeout: 60000 });
      const heading = await page.locator("h1").first().textContent({ timeout: 10000 }).catch(() => null);
      if (!heading?.trim()) issues.push(`${locale}${route}: missing heading`);
      if (await page.locator("html").getAttribute("lang") !== locale) issues.push(`${locale}${route}: incorrect document language`);
      const untranslated = await untranslatedCopy(page, locale);
      if (untranslated.length) issues.push(`${locale}${route}: English interface copy: ${untranslated.join(" | ")}`);
      console.log(locale, route, heading?.trim());
    }
    // Inspect every application step without submitting any data.
    for (const [tab, steps] of [
      ["zcg", ["Terms & Conditions", "Organization", "Project Overview", "Project Lead", "Project Details", "Budget", "Risk Assessment", "Schedule & Milestones", "Supporting Documents", "Review & Submit"]],
      ["coinholder", ["Terms & Conditions", "Applicant & organization", "Project overview", "Budget & funding", "Impact & evidence", "Review & submit"]],
    ]) {
      currentPath = `/apply?tab=${tab}`;
      await page.goto(base + (locale === "en" ? "" : `/${locale}`) + currentPath, { waitUntil: "networkidle" });
      for (const step of steps) {
        const label = locale === "en" ? step : dict[step][locale === "es" ? 0 : 1];
        await page.locator("main nav button").filter({ hasText: label }).first().click();
        const untranslated = await untranslatedCopy(page, locale);
        if (untranslated.length) issues.push(`${locale} ${tab}/${step}: English interface copy: ${untranslated.join(" | ")}`);
      }
    }
    console.log(locale, "all 16 application steps checked");
    // Long translated labels must fit narrow screens on the main listing pages.
    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of ["/", "/grants", "/decisions", "/donate", "/apply"]) {
      await page.goto(base + (locale === "en" ? "" : `/${locale}`) + route, { waitUntil: "networkidle" });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      if (overflow) issues.push(`${locale}${route}: horizontal overflow on mobile`);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    // Language switching must retain the dynamic route, query, and hash and save preference.
    await page.goto(`${base}/${locale === "en" ? "" : locale + "/"}grants/${grant.id}?tab=milestones#details`, { waitUntil: "networkidle" });
    const next = locale === "es" ? "pt-BR" : "es";
    const label = locale === "en" ? "Language" : locale === "es" ? "Idioma" : "Idioma";
    await page.getByRole("button", { name: label, exact: true }).first().click();
    await page.getByRole("menuitemradio", { name: next === "es" ? "Español" : "Português (Brasil)", exact: true }).click();
    await page.waitForURL((url) => url.pathname.startsWith(`/${next}/`));
    const url = new URL(page.url());
    if (url.search !== "?tab=milestones" || url.hash !== "#details") issues.push("Language switch lost query or hash");
    if (!(await context.cookies()).some((cookie) => cookie.name === "NEXT_LOCALE" && cookie.value === next)) issues.push("Language preference not persisted");
    await page.screenshot({ path: `/tmp/i18n-${locale}.png`, fullPage: true });
    await context.close();
  }
} finally { await browser.close(); }
if (issues.length) { console.error(issues.join("\n")); process.exitCode = 1; }
else console.log(`Verified ${routes.length * 3} localized routes and language switching.`);
