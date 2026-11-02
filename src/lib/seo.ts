export const SITE_URL = "https://zgrantshub.com";
export const SEO_LOCALES = ["en", "es", "pt-BR"] as const;

export const pageMetadata: Record<string, { title: string; description: string }> = {
  "/projects": {
    "title": "Projects & infrastructure · Zcash Grants Hub",
    "description": "Who has been funded to build what in Zcash, the repositories behind each grant, and the health and NU7 readiness of core infrastructure."
  },
  "/find-funding": {
    "title": "Find the right funding · Zcash Grants Hub",
    "description": "Answer three questions to find which Zcash funding route fits your work: ZCG, Coinholder retroactive grants, ZecHub bounties or the ZecHub DAO."
  },
  "/forum/discussions": {
    "title": "Forum discussions · Zcash Grants Hub",
    "description": "Browse active Community Grants discussions from the Zcash forum."
  },
  "/zechub/proposals/guide": {
    "title": "Create & vote · ZecHub DAO · Zcash Grants Hub",
    "description": "How to create ZecHub DAO proposals and vote using DAO DAO on Juno—wallet, links, and steps."
  },
  "/bounties": {
    "title": "Bounties & first issues · Zcash Grants Hub",
    "description": "Open ZEC bounties from ZecHub and beginner-friendly issues in Zebra, librustzcash, Zingo and other Zcash projects, in one list."
  },
  "/zechub/proposals": {
    "title": "ZecHub DAO proposals · Zcash Grants Hub",
    "description": "Browse on-chain ZecHub DAO proposals on Juno via DAO DAO—mini-grants and governance separate from ZCG GitHub review."
  },
  "/funding-streams": {
    "title": "Funding streams & NU7 · Zcash Grants Hub",
    "description": "Where each Zcash block reward goes before and after NU7, when the dev-fund streams end, and a treasury runway scenario for the ZCG funding debate."
  },
  "/developers": {
    "title": "API & feeds · Zcash Grants Hub",
    "description": "Free, read-only JSON API and RSS feed for Zcash grants data."
  },
  "/decisions": {
    "title": "ZCG decisions archive · Zcash Grants Hub",
    "description": "Search Zcash Community Grants committee decisions and each member's stated reasoning, parsed from the published meeting minutes."
  },
  "/donate": {
    "title": "Donate & contribute · Zcash Grants Hub",
    "description": "Support Zcash Grants Hub with a shielded ZEC donation, or contribute code, feedback, and reviews to the Zcash grants ecosystem."
  },
  "/retro": {
    "title": "Coinholder retro rounds · Zcash Grants Hub",
    "description": "Deadlines, phases, checklist and past results for the Zcash Coinholder-Directed Retroactive Grants Program (ZIP 1016)."
  },
  "/": {
    "title": "Zcash Grants Hub — Grants, Bounties & Funding",
    "description": "Discover Zcash grants, find funding for your project, explore bounties, and follow ZCG, Coinholder and ZecHub funding activity."
  },
  "/grants": {
    "title": "Browse grants · Zcash Grants Hub",
    "description": "Browse ZCG and Coinholder grant applications, review proposal details, and follow funding status and milestones."
  },
  "/apply": {
    "title": "Apply for a grant · Zcash Grants Hub",
    "description": "Choose a Zcash funding program and prepare your ZCG, Coinholder or ZecHub DAO proposal."
  },
  "/analytics": {
    "title": "Analytics · Zcash Grants Hub",
    "description": "Explore Zcash grant applications, funding categories, treasury balances and milestone payouts across grant programs."
  },
  "/dashboard": {
    "title": "Dashboard · Zcash Grants Hub",
    "description": "Manage your grant applications, milestone reports, watchlist and notifications."
  },
  "/auth/github/callback": {
    "title": "GitHub connection · Zcash Grants Hub",
    "description": "Connect your GitHub account to Zcash Grants Hub."
  },
  "/404": {
    "title": "Page not found · Zcash Grants Hub",
    "description": "Find grants, funding opportunities and community resources on Zcash Grants Hub."
  },
  "/grants/[id]": {
    "title": "Grant proposal · Zcash Grants Hub",
    "description": "Explore a Zcash grant proposal, its funding status, milestone progress and public discussion."
  },
  "/zechub/proposals/[id]": {
    "title": "ZecHub DAO proposal · Zcash Grants Hub",
    "description": "Explore a ZecHub DAO proposal, its status and voting activity on DAO DAO."
  }
};

export const sitemapPaths = Object.keys(pageMetadata).filter(path =>
  !path.includes("[") && !["/dashboard", "/auth/github/callback", "/404"].includes(path));

export function localizedUrl(path: string, locale = "en") {
  // Never let query strings, fragments, or protocol-relative paths change the canonical host.
  const clean = "/" + path.split(/[?#]/)[0].replace(/^\/+|\/+$/g, "");
  const prefix = locale === "es" || locale === "pt-BR" ? `/${locale}` : "";
  return SITE_URL + prefix + (clean === "/" && prefix ? "" : clean);
}

export function seoPath(pathname: string, query: Record<string, unknown>) {
  if (!pathname.includes("[id]")) return pathname === "/apply/coinholder" ? "/apply" : pathname;
  return typeof query.id === "string" ? pathname.replace("[id]", encodeURIComponent(query.id)) : null;
}

export function sitemapXml() {
  const entries = sitemapPaths.flatMap(path => SEO_LOCALES.map(locale => {
    const alternates = [...SEO_LOCALES.map(lang => `<xhtml:link rel="alternate" hreflang="${lang}" href="${localizedUrl(path, lang)}"/>`), `<xhtml:link rel="alternate" hreflang="x-default" href="${localizedUrl(path)}"/>`].join("");
    return `<url><loc>${localizedUrl(path, locale)}</loc>${alternates}</url>`;
  })).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${entries}</urlset>`;
}
