# ZcashGrantHub

The all-in-one platform for **Zcash Community Grants** — replacing the GitHub Issues workflow with a dedicated, modern grants portal.

## Features

- **Live grant data** — fetched directly from the [ZcashCommunityGrants GitHub repo](https://github.com/ZcashCommunityGrants/zcashcommunitygrants/issues)
- **Browse & filter** — search all grant applications by status, category, and amount
- **Grant detail pages** — full application fields, milestones, team info, budget, risks, and GitHub comments
- **Analytics dashboard** — live stats: applications per month, category breakdown, top applicants
- **Apply wizard** — multi-step grant application form (mirrors the official YAML template)
- **Committee dashboard** — review queue and vote panel for ZCG committee members

## Tech Stack

- [Vite](https://vitejs.dev/) + [React 18](https://react.dev/) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [TanStack Query](https://tanstack.com/query) for async data fetching
- [Recharts](https://recharts.org/) for analytics charts
- [React Router v6](https://reactrouter.com/)

## Getting Started

```bash
npm install
npm run auth:server
npm run dev
```

Open [http://localhost:8080](http://localhost:8080).

For local GitHub OAuth, keep the auth server running on port `8082` while Vite runs on `8080`.

## Optional: GitHub API Token

The app uses the public GitHub API (60 req/hr unauthenticated). To raise the limit to 5,000 req/hr, create a `.env` file:

```
VITE_GITHUB_TOKEN=ghp_your_read_only_token_here
```

## GitHub OAuth Setup

Set these in `.env`:

```
VITE_GITHUB_OAUTH_CLIENT_ID=your_github_oauth_app_client_id
VITE_GITHUB_OAUTH_REDIRECT_URI=http://localhost:8080/auth/github/callback
GITHUB_OAUTH_CLIENT_SECRET=your_github_oauth_app_client_secret
VITE_GITHUB_REPO=gorusys/zcashcommunitygrants
```

In your GitHub OAuth app settings, add `http://localhost:8080/auth/github/callback` as an authorized callback URL.

## Data Source

Grant data is fetched live from:
`https://github.com/ZcashCommunityGrants/zcashcommunitygrants/issues`

Issues are filtered to those labelled **"Grant Application"** and parsed from their markdown body into structured data.
