import { useMemo } from "react";
import { useT } from "@/i18n";
import { uiTranslator } from "./uiTranslate";

/** Translate interface copy only. Keep source records, form values and API identifiers unchanged. */
export function useUi() {
  const { locale } = useT();
  const text = useMemo(() => uiTranslator(locale), [locale]);
  return { text, locale };
}
