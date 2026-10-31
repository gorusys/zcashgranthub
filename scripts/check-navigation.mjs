/** Run against a local server: NAV_BASE_URL=http://localhost:3000 node scripts/check-navigation.mjs */
import { chromium, expect } from "@playwright/test";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
const require = createRequire(import.meta.url);
const temporary = await mkdtemp(path.join(tmpdir(), "grants-navigation-"));
await build({ entryPoints: ["src/lib/navigation.ts", "src/i18n/uiTranslate.ts"], outdir: temporary, outbase: "src", bundle: true, platform: "node", format: "cjs", outExtension: { ".js": ".cjs" }, logLevel: "silent" });
const { navigationGroups } = require(path.join(temporary, "lib/navigation.cjs"));
const { uiTranslator } = require(path.join(temporary, "i18n/uiTranslate.cjs"));
const browser = await chromium.launch({ headless: true });
const base = process.env.NAV_BASE_URL || "http://localhost:3000";
try {
  for (const locale of ["en", "es", "pt-BR"]) {
    const tx = uiTranslator(locale);
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await context.route("**/api/**", (route) => route.fulfill({ status: 503, json: { error: "Offline navigation test" } }));
    const url = (route) => base + (locale === "en" ? "" : `/${locale}`) + route;
    await page.goto(url("/developers"), { waitUntil: "networkidle" });
    const nav = page.getByRole("navigation", { name: tx("Main navigation"), exact: true });
    for (const group of navigationGroups) {
      const trigger = nav.getByRole("button", { name: tx(group.label), exact: true });
      await trigger.focus();
      await page.keyboard.press("Enter");
      const menu = page.getByRole("menu");
      await expect(menu).toBeVisible();
      for (const item of group.items) {
        const link = menu.getByRole("menuitem").filter({ hasText: tx(item.label) });
        const href = ((locale === "en" || ["/feed.xml", "/calendar.ics"].includes(item.href) ? "" : `/${locale}`) + item.href).replace(/^\/(es|pt-BR)\/$/, "/$1");
        await expect(link).toHaveAttribute("href", href);
      }
      if (locale === "en" && group.id === "explore") await page.screenshot({ path: "/tmp/navbar-desktop.png", animations: "disabled" });
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // Switching between dashboard destinations on the same route must update the actual tab.
    await page.goto(url("/dashboard?tab=notifications"), { waitUntil: "networkidle" });
    await nav.getByRole("button", { name: tx("My activity"), exact: true }).click();
    await page.getByRole("menuitem", { name: tx("My Applications"), exact: true }).click();
    await expect(page.getByRole("tab", { name: tx("My Applications"), exact: true })).toHaveAttribute("aria-selected", "true");
    await page.getByRole("tab", { name: tx("Milestone Reports"), exact: true }).click();
    await expect(page).toHaveURL(/tab=milestones/);
    // Mobile includes every destination and scrolls independently of the locked page.
    await page.setViewportSize({ width: 390, height: 844 });
    const toggle = nav.getByRole("button", { name: tx("Open menu"), exact: true });
    await toggle.click();
    const mobile = page.locator("#mobile-navigation");
    await expect(mobile).toBeVisible();
    if (locale === "en") await page.screenshot({ path: "/tmp/navbar-mobile.png", animations: "disabled" });
    for (const group of navigationGroups) {
      const trigger = mobile.getByRole("button", { name: tx(group.label), exact: true });
      if (await trigger.getAttribute("aria-expanded") !== "true") await trigger.click();
      for (const item of group.items) await expect(mobile.getByRole("region", { name: tx(group.label), exact: true }).getByRole("link", { name: tx(item.label), exact: true })).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.keyboard.press("Escape");
    await expect(mobile).toHaveCount(0);
    await expect(toggle).toBeFocused();
    await toggle.click();
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(mobile).toHaveCount(0);
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
    await page.setViewportSize({ width: 390, height: 844 });
    await toggle.click();
    const resources = mobile.getByRole("button", { name: tx("Resources"), exact: true });
    if (await resources.getAttribute("aria-expanded") !== "true") await resources.click();
    await mobile.getByRole("link", { name: tx("API & feeds"), exact: true }).click();
    await expect(mobile).toHaveCount(0);
    await expect(page).toHaveURL(url("/developers"));
    const footer = page.getByRole("navigation", { name: tx("Footer navigation"), exact: true });
    for (const group of navigationGroups) for (const item of group.items) await expect(footer.getByRole("link", { name: tx(item.label), exact: true })).toHaveCount(1);
    await page.setViewportSize({ width: 320, height: 640 });
    await toggle.click();
    await expect(mobile).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.keyboard.press("Escape");
    expect(errors).toEqual([]);
    console.log(`${locale}: all grouped links, keyboard navigation, dashboard tabs, mobile menu and resizing passed`);
    await context.close();
  }
} finally {
  await browser.close();
  await rm(temporary, { recursive: true, force: true });
}
