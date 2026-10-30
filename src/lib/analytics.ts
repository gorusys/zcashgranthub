/**
 * Optional, cookieless usage analytics (Plausible or Umami), off unless configured.
 * Aggregate counts only: no cookies, no personal data, no addresses or amounts.
 *
 *   NEXT_PUBLIC_PLAUSIBLE_DOMAIN=zgrantshub.com
 *   NEXT_PUBLIC_PLAUSIBLE_SRC=https://plausible.io/js/script.js   (optional, for self-hosting)
 * or
 *   NEXT_PUBLIC_UMAMI_WEBSITE_ID=<uuid>
 *   NEXT_PUBLIC_UMAMI_SRC=https://umami.example.com/script.js
 */

export type AnalyticsEvent =
  | "apply_submitted"
  | "apply_draft_opened"
  | "donate_copy_address"
  | "donate_open_wallet"
  | "funding_finder_result"
  | "outbound_program";

type Props = Record<string, string | number | boolean>;

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Props }) => void;
    umami?: { track: (event: string, data?: Props) => void };
  }
}

export interface AnalyticsScript {
  src: string;
  attrs: Record<string, string>;
}

export function analyticsScript(): AnalyticsScript | null {
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  if (plausibleDomain) {
    return {
      src:
        process.env.NEXT_PUBLIC_PLAUSIBLE_SRC || "https://plausible.io/js/script.js",
      attrs: { "data-domain": plausibleDomain },
    };
  }
  const umamiId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  const umamiSrc = process.env.NEXT_PUBLIC_UMAMI_SRC;
  if (umamiId && umamiSrc) {
    return { src: umamiSrc, attrs: { "data-website-id": umamiId } };
  }
  return null;
}

/** Fire-and-forget custom event. Never throws; no-op when analytics is off. */
export function track(event: AnalyticsEvent, props?: Props): void {
  if (typeof window === "undefined") return;
  try {
    if (window.plausible) window.plausible(event, props ? { props } : undefined);
    else if (window.umami) window.umami.track(event, props);
  } catch {
    /* analytics must never break the page */
  }
}
