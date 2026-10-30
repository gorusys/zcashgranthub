import Head from "next/head";
import { Code2, Rss } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ENDPOINTS: Array<{ path: string; desc: string; params?: string; example: string }> = [
  {
    path: "GET /api/v1/grants",
    desc: "All ZCG and Coinholder grant applications, normalized: status, category, USD amounts, milestone progress, raw GitHub labels and links.",
    params: "program=zcg|coinholder · status=ACTIVE,APPROVED (comma list) · category=Wallets · q=text · updatedSince=2026-10-01",
    example: "/api/v1/grants?program=zcg&status=ACTIVE",
  },
  {
    path: "GET /api/v1/retro-rounds",
    desc: "Coinholder retro rounds: official dates, current phase, next milestone, and per-round outcomes (on ballot, funded, rejected, USD totals, grant ids).",
    example: "/api/v1/retro-rounds",
  },
  {
    path: "GET /api/zcg/decisions",
    desc: "ZCG committee decisions parsed from meeting minutes: outcome, requested amount, summary and each member's statement.",
    params: "q=text · outcome=approved|declined|open · forumLink=&title= (decisions for one grant) · limit",
    example: "/api/zcg/decisions?outcome=declined&limit=20",
  },
  {
    path: "GET /api/opportunities",
    desc: "Open ZecHub ZEC bounties and unassigned good-first-issue / help-wanted issues across Zcash GitHub orgs.",
    example: "/api/opportunities",
  },
  {
    path: "GET /api/chain/tip",
    desc: "Current mainnet height and block time (Blockchair, with an estimate fallback).",
    example: "/api/chain/tip",
  },
  {
    path: "GET /feed.xml",
    desc: "RSS 2.0 feed of the 50 most recently updated grants. Add ?program=zcg or ?program=coinholder via /api/v1/feed.",
    example: "/feed.xml",
  },
];

export default function DevelopersPage() {
  return (
    <div className="container mx-auto min-w-0 max-w-4xl px-4 py-6 sm:py-8">
      <Head>
        <title>API & feeds · Zcash Grants Hub</title>
        <meta name="description" content="Free, read-only JSON API and RSS feed for Zcash grants data." />
      </Head>
      <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
        <Code2 className="h-7 w-7 text-primary" /> API &amp; feeds
      </h1>
      <p className="mb-6 mt-2 text-sm text-muted-foreground sm:text-base">
        Free, read-only, no key needed. Responses are JSON with CORS enabled, cached for about
        five minutes, and built from the programs' public GitHub repositories and forum posts.
        Fields are only added within <code>v1</code>, never renamed or removed.
      </p>
      <div className="space-y-4">
        {ENDPOINTS.map((e) => (
          <Card key={e.path}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 font-mono text-base">
                {e.path === "GET /feed.xml" && <Rss className="h-4 w-4 text-primary" />}
                {e.path}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">{e.desc}</p>
              {e.params && (
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Query: </span>
                  <code className="break-words">{e.params}</code>
                </p>
              )}
              <a href={e.example} className="inline-block break-all font-mono text-xs text-primary hover:underline">
                {e.example}
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Building something with this data? Open an issue or PR on{" "}
        <a href="https://github.com/gorusys/zcashgranthub" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
        . The hub is open source, and other projects using the data helps keep it maintained.
      </p>
    </div>
  );
}
