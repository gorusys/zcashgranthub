import Head from "next/head";
import { useRouter } from "next/router";
import { useUi } from "@/i18n/useUi";
import { localizedUrl, pageMetadata, SEO_LOCALES, seoPath, SITE_URL } from "@/lib/seo";

export function Seo({ title, description }: { title?: string; description?: string }) {
  const router = useRouter();
  const { text: tx } = useUi();
  const path = seoPath(router.pathname, router.query);
  const defaults = pageMetadata[router.pathname === "/apply/coinholder" ? "/apply" : router.pathname] ?? pageMetadata["/404"];
  const pageTitle = title ?? tx(defaults.title);
  const pageDescription = description ?? tx(defaults.description);
  const noindex = !pageMetadata[router.pathname] || ["/dashboard", "/auth/github/callback", "/404"].includes(router.pathname);
  const canonical = path ? localizedUrl(path, router.locale) : undefined;
  const ogLocale = router.locale === "pt-BR" ? "pt_BR" : router.locale === "es" ? "es_ES" : "en_US";
  return <Head>
    <title>{pageTitle}</title>
    <meta key="description" name="description" content={pageDescription} />
    <meta key="robots" name="robots" content={noindex ? "noindex, follow" : "index, follow, max-image-preview:large"} />
    {canonical && <link key="canonical" rel="canonical" href={canonical} />}
    {!noindex && path && [...SEO_LOCALES, "x-default"].map(locale => <link key={`alternate-${locale}`} rel="alternate" hrefLang={locale} href={localizedUrl(path, locale)} />)}
    <meta key="og:title" property="og:title" content={pageTitle} />
    <meta key="og:description" property="og:description" content={pageDescription} />
    <meta key="og:type" property="og:type" content={"website"} />
    <meta key="og:site_name" property="og:site_name" content="Zcash Grants Hub" />
    {canonical && <meta key="og:url" property="og:url" content={canonical} />}
    <meta key="og:locale" property="og:locale" content={ogLocale} />
    <meta key="og:image" property="og:image" content={`${SITE_URL}/logo.png`} />
    <meta key="og:image:width" property="og:image:width" content="512" />
    <meta key="og:image:height" property="og:image:height" content="512" />
    <meta key="og:image:alt" property="og:image:alt" content="Zcash Grants Hub" />
    <meta key="twitter:card" name="twitter:card" content={"summary"} />
    <meta key="twitter:title" name="twitter:title" content={pageTitle} />
    <meta key="twitter:description" name="twitter:description" content={pageDescription} />
    <meta key="twitter:image" name="twitter:image" content={`${SITE_URL}/logo.png`} />
    <meta key="twitter:image:alt" name="twitter:image:alt" content="Zcash Grants Hub" />
    {router.pathname === "/" && <script key="website-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "WebSite", "@id": `${SITE_URL}/#website`, name: "Zcash Grants Hub", url: SITE_URL, description: pageDescription, inLanguage: SEO_LOCALES }).replace(/</g, "\\u003c") }} />}
  </Head>;
}
