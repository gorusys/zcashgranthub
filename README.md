# Zcash Grants Hub

A multi-program **grants explorer** for the Zcash ecosystem: **Zcash Community Grants (ZCG)** and **Coinholder** applications from GitHub, **ZecHub DAO** mini-grants on DAO DAO (Juno), and links to the community **Google Sheet** used for summaries and operations (not a fourth “grant type” in the UI).

Official domain: [zgrantshub.com](https://zgrantshub.com)

## Features

- **Live GitHub data** — ZCG repo (configurable) plus optional **Coinholder** repo; grants use composite ids (`zcg-123`, `coinholder-4`) with legacy numeric routes still resolving as ZCG.
- **ZecHub proposals** — `/zechub/proposals` and `/zechub/proposals/[id]` backed by the DAO DAO indexer.
- **Related records** — Heuristic cross-links between programs (title similarity, issue references in proposal text) plus optional maintainer overrides in `src/data/grant-links.json` (`/api/related/for-grant`, `/api/related/for-proposal`).
- **Browse & filter** — Search, status, category, and **program** filter on `/grants`.
- **Grant detail** — Application fields, milestones, team, budget, risks, comments; **no** embedded DAO vote as ZCG status—only relationship suggestions and clear separation of programs.
- **Apply wizards** — Single `/apply` page with **ZCG**, **Coinholder**, and **ZecHub DAO** tabs. ZCG/Coinholder create GitHub issues; ZecHub links to DAO DAO. `/apply/coinholder` redirects to `/apply?tab=coinholder`.
- **Funding streams & NU7** — `/funding-streams` shows the live chain height, the 80/8/12 split per block and per day before and after NU7 (ZIP 218 values), when the streams end (height 6,132,390) and NSM reissuance starts, and a ZCG treasury runway scenario for the proposal to end the 8% stream. Chain tip from Blockchair via `/api/chain/tip`, with an estimate fallback.
- **Notifications without accounts** — press Watch on any grant; the bell and Dashboard → Notifications show status changes and new GitHub activity since you last looked (your own applications are watched automatically when GitHub is connected). The watchlist lives only in the browser. `/calendar.ics` is a subscribable calendar of retro round deadlines, voting windows and protocol milestones; `/feed.xml` is RSS.
- **Bounties & first issues** — `/bounties` lists open, unclaimed ZecHub ZEC bounties (public `zechub.zone` API) and unassigned good-first-issue / help-wanted / bounty issues across zcash, ZcashFoundation, zingolabs, zodl-inc and ZecHub (`/api/opportunities`, cached 30 min).
- **ZCG decisions archive** — `/decisions` and a card on each ZCG grant page show what the committee decided and each member's stated reasoning, parsed from @ZCG meeting minutes on the forum (`/api/zcg/decisions`). Minutes are fetched once, cached on disk (`MINUTES_CACHE_PATH`) and refreshed hourly, with backoff when the forum rate-limits.
- **Public API & RSS** — read-only, CORS-enabled `/api/v1/grants` (filters: `program`, `status`, `category`, `q`, `updatedSince`), `/api/v1/retro-rounds`, and an RSS feed at `/feed.xml`; documented at `/developers`. Set `NEXT_PUBLIC_SITE_URL` if not deployed at zgrantshub.com.
- **Proposal preflight** — the ZCG wizard's Review step checks budget/milestone consistency, dated milestones with deliverables and acceptance criteria, measurable KPIs, funding disclosure and KYC, with a Fix link to the right step, and lists similar past applications and their outcomes.
- **Funding Finder** — `/find-funding` asks three questions (work stage, size, kind) and ranks the routes that fit (Coinholder retro, ZCG, ZecHub bounties, ZecHub DAO) with each program's rules and next steps.
- **Coinholder retro rounds** — `/retro` shows the current round phase with a countdown, the FPF timeline, a pre-submission checklist, this round's submissions, past-round outcomes (counts from FPF GitHub labels) and live organizer announcements from the forum. Round dates live in `src/data/retro-rounds.json`; add each new round from FPF's forum post and cite it in `sources`.
- **Analytics dashboard**.

## Tech Stack

- [Next.js](https://nextjs.org/) + [React 18](https://react.dev/) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [TanStack Query](https://tanstack.com/query) for async data fetching
- [Recharts](https://recharts.org/) for analytics charts
- Next.js file-based routing

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

GitHub OAuth token exchange runs via Next API routes under `/api/auth/...`, so one `npm run dev` process is enough.

## Optional: GitHub API Token

Grant data is fetched **server-side** (`/api/grants`, `/api/grants/[id]`) and cached for 5 minutes (15 without a token) with stale-while-revalidate, so all visitors share one upstream fetch and the last good snapshot keeps serving if GitHub is down. Unauthenticated, GitHub allows 60 req/hr; to raise it to 5,000 req/hr, set a read-only token in `.env`:

```
GITHUB_API_TOKEN=ghp_your_read_only_token_here
```

Without a token the hub still copes: GitHub reads use conditional requests (ETags), and `304 Not Modified` responses don't count against the limit. The last good snapshot is also written to disk (`GRANTS_SNAPSHOT_PATH`, default in the OS temp dir), so restarts and cold starts serve data immediately.

> **Do not** use `NEXT_PUBLIC_GITHUB_TOKEN`: anything prefixed `NEXT_PUBLIC_` is bundled into browser JavaScript. It is now ignored (with a server warning); if you set it previously, revoke that token.

## Optional: privacy-respecting analytics

Off by default. When enabled, the site loads a cookieless script ([Plausible](https://plausible.io) or self-hosted [Umami](https://umami.is)) and records aggregate page views plus a few named events (`apply_submitted`, `apply_draft_opened`, `donate_copy_address`, `donate_open_wallet`, `funding_finder_result`, `outbound_program`). No cookies, no personal data, no addresses or amounts. These numbers are the usage evidence for retroactive grant applications.

```
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=zgrantshub.com
# NEXT_PUBLIC_PLAUSIBLE_SRC=https://plausible.example.com/js/script.js   # self-hosted
# or
# NEXT_PUBLIC_UMAMI_WEBSITE_ID=<uuid>
# NEXT_PUBLIC_UMAMI_SRC=https://umami.example.com/script.js
```

## GitHub repos

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_ZCG_GITHUB_REPO` | ZCG grants repo slug |
| `NEXT_PUBLIC_GITHUB_REPO_COINHOLDER` | Coinholder grants repo slug |
| `NEXT_PUBLIC_GITHUB_REPO_COINHOLDER_DISABLED=1` | Omit Coinholder from aggregation |

## ZecHub DAO (DAO DAO on Juno)

Defaults match the live ZecHub DAO; override only if contracts move.

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_ZECHUB_DAO_CORE` | DAO Core (`dao-core`) contract address on Juno |
| `NEXT_PUBLIC_ZECHUB_PROPOSAL_MODULE_SINGLE` | Single-choice proposal module used for prefix **A** proposals |
| `NEXT_PUBLIC_DAO_DAO_INDEXER_BASE` | DAO DAO indexer base URL (default `https://indexer.daodao.zone`) |

**Grants API:** `/api/grants` (all parsed grants + `fetchedAt`), `/api/grants/[id]` (one grant with comments).

**API routes:** `/api/daodao/proposals-list`, `/api/daodao/proposal?id=`, `/api/daodao/dao-meta`, `/api/daodao/zechub` (resolve ZecHub proposal by id, GitHub issue, or title).  
**UI:** `/zechub/proposals`, `/zechub/proposals/[id]`.

## GitHub OAuth Setup

Set these in `.env`:

```
NEXT_PUBLIC_GITHUB_OAUTH_CLIENT_ID=your_github_oauth_app_client_id
NEXT_PUBLIC_GITHUB_OAUTH_REDIRECT_URI=http://localhost:3000/auth/github/callback
GITHUB_OAUTH_CLIENT_SECRET=your_github_oauth_app_client_secret
NEXT_PUBLIC_ZCG_GITHUB_REPO=ZcashCommunityGrants/zcashcommunitygrants
```

In your GitHub OAuth app settings, add `http://localhost:3000/auth/github/callback` as an authorized callback URL.

## Cross-program links

Optional explicit mappings live in **`src/data/grant-links.json`** (validated by maintainers). The related APIs merge these with heuristics.

## Official program links

- [Zcash Community Grants](https://zcashcommunitygrants.org/)
- [ZecHub bounties](https://bounties.zechub.wiki/)
- [Coinholder program (GitHub)](https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram)
- [ZecHub DAO (wiki)](https://zechub.wiki/dao)

The hub also links the [community operations spreadsheet](https://docs.google.com/spreadsheets/d/1FQ28rDCyRW0TiNxrm3rgD8ai2KGUsXAjPieQmI1kKKg) as a dashboard, not as a competing browse index.
