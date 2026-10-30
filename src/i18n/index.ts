/**
 * Minimal i18n on top of Next.js locale routing (pages router). English is the
 * source of truth; a missing translation falls back to English at runtime and
 * fails the type check at build time.
 */
import { useRouter } from "next/router";
import { useMemo } from "react";
import { DEFAULT_LOCALE, LOCALES, translator, type Locale, type Translate } from "./translate";

export * from "./translate";

export function useT(): { t: Translate; locale: Locale } {
  const { locale } = useRouter();
  const current = (LOCALES as readonly string[]).includes(locale ?? "") ? (locale as Locale) : DEFAULT_LOCALE;
  const t = useMemo(() => translator(current), [current]);
  return { t, locale: current };
}
