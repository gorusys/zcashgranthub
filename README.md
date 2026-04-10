# ZcashGrantHub

A multi-program **grants explorer** for the Zcash ecosystem: **Zcash Community Grants (ZCG)** and **Coinholder** applications from GitHub, **ZecHub DAO** mini-grants on DAO DAO (Juno), and links to the community **Google Sheet** used for summaries and operations (not a fourth “grant type” in the UI).

## Features

- **Live GitHub data** — ZCG repo (configurable) plus optional **Coinholder** repo; grants use composite ids (`zcg-123`, `coinholder-4`) with legacy numeric routes still resolving as ZCG.
- **ZecHub proposals** — `/zechub/proposals` and `/zechub/proposals/[id]` backed by the DAO DAO indexer.
- **Related records** — Heuristic cross-links between programs (title similarity, issue references in proposal text) plus optional maintainer overrides in `src/data/grant-links.json` (`/api/related/for-grant`, `/api/related/for-proposal`).
- **Browse & filter** — Search, status, category, and **program** filter on `/grants`.
- **Grant detail** — Application fields, milestones, team, budget, risks, comments; **no** embedded DAO vote as ZCG status—only relationship suggestions and clear separation of programs.
- **Apply wizards** — Single `/apply` page with **ZCG** and **Coinholder** tabs; Coinholder creates issues in the Coinholder repo with the correct label. `/apply/coinholder` redirects to `/apply?tab=coinholder`.
- **Analytics dashboard**, **Committee dashboard**.

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

The app uses the public GitHub API (60 req/hr unauthenticated). To raise the limit to 5,000 req/hr, create a `.env` file:

```
NEXT_PUBLIC_GITHUB_TOKEN=ghp_your_read_only_token_here
```

## GitHub repos

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_ZCG_GITHUB_REPO` | ZCG grants repo slug |
| `NEXT_PUBLIC_GITHUB_REPO_COINHOLDER` | Coinholder grants repo slug |
| `NEXT_PUBLIC_GITHUB_REPO_COINHOLDER_DISABLED=1` | Omit Coinholder from aggregation |

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
- [Zcash Foundation grants](https://zfnd.org/grants/)
- [Coinholder program (GitHub)](https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram)
- [ZecHub DAO (wiki)](https://zechub.wiki/dao)

The hub also links the [community operations spreadsheet](https://docs.google.com/spreadsheets/d/1FQ28rDCyRW0TiNxrm3rgD8ai2KGUsXAjPieQmI1kKKg) as a dashboard, not as a competing browse index.
