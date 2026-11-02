import type { GetServerSideProps } from "next";
import { sitemapXml } from "@/lib/seo";

// Next.js page modules colocate their server data function with the page.
// eslint-disable-next-line react-refresh/only-export-components
export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400");
  res.end(sitemapXml());
  return { props: {} };
};

export default function Sitemap() { return null; }
