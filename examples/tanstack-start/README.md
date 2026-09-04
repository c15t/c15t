# c15t × TanStack Start example

Minimal c15t TanStack Start integration through the `c15t` umbrella package
(`c15t/tanstack-start` ≡ `@c15t/tanstack-start`): a server function in the
root route loader, one `<ConsentBoundary>` around the app, one splat server
route for the same-origin consent endpoints, plus a self-hosted
`@c15t/backend` mounted at `/api/self-host` (`src/routes/api/self-host/$.ts`)
so the whole demo, including the consent manifest, is served from a single
origin.

```bash
bun install
bun run dev        # http://localhost:3010
```

## What it shows

- `src/routes/__root.tsx` declares `getConsentConfig` with
  `createServerFn().handler(createConsentConfigHandler({ backendURL }))`.
  The loader runs it on the server, where it reads the `c15t` cookie and the
  geo headers and resolves init from the backend manifest. `ConsentBoundary`
  reads the result back with `Route.useLoaderData()`, so the banner is in the
  first HTML with zero CLS and hydration never disagrees with the server.
  `consentLoaderOptions` keeps the loader from re-running on client-side
  navigation.
- `src/routes/api/c15t/$.ts` mounts `createConsentServerRoute()`.
  `GET /api/c15t/manifest` passes the cached backend manifest through with its
  `cache-control` and `etag` (and answers `304` to `if-none-match`);
  `GET /api/c15t/init` resolves consent locally from that manifest for the
  request's country, region, language, and GPC signal, with no
  consent-backend round trip on the request path. See
  `internals/rfcs/0001-consent-manifest.md`.
- `src/start.ts` registers `consentRequestMiddleware()` so server routes,
  server functions, and the self-hosted backend all read one canonical set of
  `x-c15t-country` / `x-c15t-region` / `sec-gpc` headers, whichever CDN
  populated them.
- `src/routes/index.tsx` reads the live state with the re-exported React
  hooks (`useConsent('marketing')`, `useActiveUI`, `usePolicyDecision`, ...)
  and opens the preferences dialog with `useSetActiveUI()`.

Try the region preview from the page itself, or by hand: `?country=DE`
resolves GDPR/opt-in with a banner, `?country=US&region=CA` resolves
CCPA/opt-out with no banner at all. `src/middleware/region-override.ts`
turns the query into geo headers; it also reads the `referer` for
same-origin follow-up requests (`/api/c15t/init`, `POST /subjects`) so the
browser stays on the policy the server rendered. It is a development aid,
not part of the integration.

## Storage

Selection lives in `lib/adapter.ts`, shared by the server route and the CLI
config. Both modes are Postgres, only the destination changes:

- **Local dev**: [PGlite](https://pglite.dev), Postgres compiled to WASM,
  running in-process with its data directory in `.pgdata/`. Gitignored,
  created and migrated on first request, so `bun run dev` needs zero setup.
- **Deployed**: Postgres via `DATABASE_URL`. Deploys fail fast without it
  rather than falling back to an embedded database a read-only filesystem
  can't write. Migrate with `bun run db:migrate`, which runs
  `@c15t/cli self-host migrate` against `c15t-backend.config.ts`.

PGlite rather than SQLite on purpose: SQLite ships with `PRAGMA foreign_keys`
off, so a consent row referencing a policy that doesn't exist inserts happily
locally and only fails once deployed. Delete `.pgdata/` to reset the demo.

## Pointing at a hosted backend

Set `C15T_BACKEND_URL` to your c15t instance to skip the self-hosted route:

```bash
C15T_BACKEND_URL=https://your-instance.c15t.dev bun run dev
```

`vite.config.ts` lists `C15T_` as an env prefix, so the same value reaches
the server function (manifest prefetch) and the browser (`POST /subjects`).
The self-host route keeps working but nothing calls it.

## Production build

```bash
bun run build
DATABASE_URL=postgres://... bun run start
```
