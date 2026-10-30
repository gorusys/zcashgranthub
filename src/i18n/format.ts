/** Format numeric cells from the English-formatted public accounting workbook. */
export function formatSpreadsheetValue(value: string | null | undefined, locale: string): string | undefined {
  if (value == null) return undefined;
  const source = value.trim();
  if (!/^(?:-?\s*\$\s*|\$-?)?[\d,]+(?:\.\d+)?(?:\s*(?:%|ZEC))?$/.test(source)) return value;
  const numeric = Number(source.replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(numeric)) return value;
  const digits = source.match(/\.(\d+)/)?.[1].length ?? 0;
  if (source.includes("$")) return new Intl.NumberFormat(locale, { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(numeric);
  if (source.endsWith("%")) return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: digits }).format(numeric / 100);
  return new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(numeric) + (source.endsWith("ZEC") ? " ZEC" : "");
}

/** The workbook publishes its block timestamp in English and UTC. */
export function formatSpreadsheetTimestamp(value: string, locale: string): string {
  const match = value.match(/^(\d{1,2}) ([A-Za-z]{3}) (\d{4}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return value;
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(match[2]);
  if (month < 0) return value;
  const date = new Date(Date.UTC(Number(match[3]), month, Number(match[1]), Number(match[4]), Number(match[5]), Number(match[6])));
  return date.toLocaleString(locale, { timeZone: "UTC" });
}
