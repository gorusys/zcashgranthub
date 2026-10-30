/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep in sync with LOCALES in src/i18n/index.ts.
  i18n: { locales: ["en", "es", "pt-BR"], defaultLocale: "en" },
  async rewrites() {
    return [
      { source: "/feed.xml", destination: "/api/v1/feed" },
      { source: "/calendar.ics", destination: "/api/v1/calendar" },
    ];
  },
  async redirects() {
    return [
      { source: "/contribute", destination: "/donate#contribute", permanent: false },
    ];
  },
};

export default nextConfig;
