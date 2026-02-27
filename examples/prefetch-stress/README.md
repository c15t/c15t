# Prefetch Stress App

This app is for reproducing c15t Next.js server-side `/init` volume under heavy route prefetching.

## Run

```bash
bun install
bun --cwd examples/prefetch-stress build
bun --cwd examples/prefetch-stress start
```

Open http://localhost:4010 and watch:

- Dashboard counters on the page
- Server logs printed by `/api/c15t/init`
- Note: Next.js prefetch behavior is intentionally tested in production mode (`build` + `start`), not `dev`.

## What it does

- Calls `fetchInitialData({ backendURL: 'http://localhost:4010/api/c15t', debug: true })` inside both `app/page.tsx` and `app/p/[id]/page.tsx` server components (override with `PREFETCH_STRESS_BACKEND_URL`).
- Programmatically triggers `router.prefetch()` for 100 routes (`/p/1` through `/p/100`).
- Exposes log endpoints:
  - `GET /api/c15t/logs`
  - `POST /api/c15t/reset`
