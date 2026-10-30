import en from "./messages/en";
import es from "./messages/es";
import pt from "./messages/pt-BR";
import translations from "./messages/ui.json";
import { DEFAULT_LOCALE, type Locale } from "./translate";

export type UiVars = Record<string, string | number>;
const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
const ui = Object.fromEntries(Object.entries(translations).map(([key, value]) => [normalize(key), value])) as Record<string, string[]>;
const catalogs = { es, "pt-BR": pt };
const existing = Object.fromEntries(Object.entries(en).map(([key, value]) => [normalize(value), key]));
const existingLower = Object.fromEntries(Object.entries(existing).map(([value, key]) => [value.toLowerCase(), key]));
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Compatibility with interface messages produced by shared, locale-independent validation helpers.
const patterns = Object.keys(ui).filter((key) => /\{\d+\}/.test(key)).map((key) => {
  const names: string[] = [];
  const pieces = key.split(/(\{\d+\})/g).map((piece) => {
    if (/^\{\d+\}$/.test(piece)) { names.push(piece.slice(1, -1)); return "(.*?)"; }
    return escapeRegex(piece);
  });
  return { key, names, regex: new RegExp(`^${pieces.join("")}$`) };
}).sort((a, b) => b.key.replace(/\{\d+\}/g, "").length - a.key.replace(/\{\d+\}/g, "").length);

export function uiTranslator(locale: string | undefined) {
  const current: Locale = locale === "es" || locale === "pt-BR" ? locale : DEFAULT_LOCALE;
  return (source: string | null | undefined, vars?: UiVars): string => {
    if (typeof source !== "string") return source ?? "";
    if (source == null) return "";
    const key = normalize(source);
    let value = key;
    let matched = false;
    let values = vars;
    if (current !== "en") {
      const index = current === "es" ? 0 : 1;
      const oldKey = (existing[key] ?? existingLower[key.toLowerCase()]) as keyof typeof en | undefined;
      value = ui[key]?.[index] ?? (oldKey ? catalogs[current][oldKey] : key);
      matched = Boolean(ui[key] || oldKey);
      if (value === key && !vars) {
        for (const pattern of patterns) {
          const match = key.match(pattern.regex);
          if (!match) continue;
          value = ui[pattern.key][index];
          matched = true;
          values = Object.fromEntries(pattern.names.map((name, i) => [name, match[i + 1]]));
          break;
        }
      }
    }
    if (!matched && !values) return source;
    if (values) value = value.replace(/\{(\w+)\}/g, (match, name) => name in values! ? uiTranslator(current)(String(values![name])) : match);
    // Preserve deliberate spaces around inline links and emphasis.
    const leading = source.match(/^\s*/)?.[0] ?? "";
    const trailing = source.match(/\s*$/)?.[0] ?? "";
    return key ? leading + value + trailing : source;
  };
}
