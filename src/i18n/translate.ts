/** Locale catalog and the pure translator (no React), usable from lib code and tests. */
import en, { type MessageKey, type Messages } from "./messages/en";
import es from "./messages/es";
import ptBR from "./messages/pt-BR";

export const LOCALES = ["en", "es", "pt-BR"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

const CATALOG: Record<Locale, Messages> = { en, es, "pt-BR": ptBR };

export type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

export function translator(locale: string | undefined): Translate {
  const messages = CATALOG[(locale as Locale) ?? DEFAULT_LOCALE] ?? en;
  return (key, vars) => {
    const template = messages[key] ?? en[key] ?? key;
    return vars ? template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : template;
  };
}

export const translateEn: Translate = translator("en");

export function localeName(l: Locale): string {
  return CATALOG[l]["lang.name"];
}

export type { MessageKey };
