import { describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import dictionary from "@/i18n/messages/ui.json";
import { formatSpreadsheetTimestamp, formatSpreadsheetValue } from "@/i18n/format";
import { uiTranslator } from "@/i18n/uiTranslate";
import { StatusBadge } from "@/components/StatusBadge";
import { CategoryBadge } from "@/components/CategoryBadge";
import { ZechubProposalCard } from "@/components/ZechubProposalCard";
import { UiText } from "@/i18n/ui";

const state = vi.hoisted(() => ({ locale: "es", push: vi.fn() }));
vi.mock("next/router", () => ({ useRouter: () => ({ locale: state.locale, pathname: "/grants/[id]", query: { id: "zcg-42", tab: "milestones" }, asPath: "/grants/zcg-42?tab=milestones#details", push: state.push }) }));
const placeholders = (value: string) => [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("site interface translations", () => {
  it("defines two non-empty translations with matching placeholders for every source", () => {
    for (const [source, values] of Object.entries(dictionary)) {
      expect(values, source).toHaveLength(2);
      for (const value of values) {
        expect(value.trim(), source).not.toBe("");
        expect(placeholders(value), source).toEqual(placeholders(source));
      }
    }
  });

  it("translates shared copy, preserves inline spacing, and falls back for unknown locales", () => {
    expect(uiTranslator("es")(" Budget ")).toBe(" Presupuesto ");
    expect(uiTranslator("pt-BR")("Budget")).toBe("Orçamento");
    expect(uiTranslator("fr")("Budget")).toBe("Budget");
    expect(uiTranslator("es")(" ")).toBe(" ");
    expect(uiTranslator("es")("Uncatalogued diagnostic")).toBe("Uncatalogued diagnostic");
  });

  it("translates interpolated labels, nested UI labels and validation messages", () => {
    const tx = uiTranslator("es");
    expect(tx("Loading {0}", { 0: "ZCG Treasury" })).toBe("Cargando Tesorería ZCG");
    expect(tx("Milestone 2 has no completion date.")).toBe("El hito 2 no tiene fecha de finalización.");
    expect(tx("Milestones add up to $1, but the budget total is $2.")).toBe("Los hitos suman $1, pero el presupuesto total es $2.");
    expect(tx("{0} days ago", { 0: 3 })).toBe("hace 3 días");
    expect(tx("Switch to {0} mode", { 0: "dark" })).toBe("Cambiar al modo oscuro");
  });

  it.each([ ["es", "Activo", "Carteras"], ["pt-BR", "Ativo", "Carteiras"] ])("renders common components in %s", (locale, status, category) => {
    state.locale = locale;
    render(<><StatusBadge status="ACTIVE" /><CategoryBadge category="Wallets" /><UiText text="Budget" /></>);
    // Status translations use the shared English source catalog.
    expect(screen.getByText(status)).toBeTruthy();
    expect(screen.getByText(category)).toBeTruthy();
    expect(screen.getByText(locale === "es" ? "Presupuesto" : "Orçamento")).toBeTruthy();
    cleanup();
  });

  it("formats accounting figures using the selected language without altering diagnostic text", () => {
    expect(formatSpreadsheetValue("$ 123,325,958", "pt-BR")).toBe(new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(123325958));
    expect(formatSpreadsheetValue("-$ 2,417,165", "es")).toBe(new Intl.NumberFormat("es", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(-2417165));
    expect(formatSpreadsheetValue("92,630.87 ZEC", "pt-BR")).toBe("92.630,87 ZEC");
    expect(formatSpreadsheetValue("1.96%", "pt-BR")).toBe("1,96%");
    expect(formatSpreadsheetValue("Status: OK", "es")).toBe("Status: OK");
    expect(formatSpreadsheetValue(undefined, "es")).toBeUndefined();
    expect(formatSpreadsheetTimestamp("30 Oct 2026 13:42:24", "pt-BR")).toBe(new Date("2026-10-30T13:42:24Z").toLocaleString("pt-BR", { timeZone: "UTC" }));
    expect(formatSpreadsheetTimestamp("Unknown time", "es")).toBe("Unknown time");
  });

  it("preserves an upstream proposal title even if it matches interface copy", () => {
    state.locale = "es";
    render(<ZechubProposalCard row={{ id: 1, proposal: { title: "Budget", status: "open", votes: { yes: "1", no: "0", abstain: "0" } } }} />);
    expect(screen.getByRole("heading", { name: "Budget" })).toBeTruthy();
    expect(screen.getByText("Abierta")).toBeTruthy();
    cleanup();
  });
});
