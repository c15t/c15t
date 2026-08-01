# c15t × Nuxt example

Minimal `@c15t/vue` integration: one module entry in `nuxt.config.ts`, one
`<ConsentRoot />` in `app.vue` — plus a self-hosted `@c15t/backend` mounted
at `/api/self-host` (`server/api/self-host/[...all].ts`) so the whole demo,
including the consent manifest, is served from a single origin.

```bash
bun install
bun run dev
```

`manifest: true` enables same-origin, CDN-cacheable consent resolution — the
module's server routes fetch `GET /api/self-host/manifest` once, cache it,
and resolve `/api/c15t/init` locally from geo/language/GPC headers with no
consent-backend round trip on the request path — see
`internals/rfcs/0001-consent-manifest.md`. The banner is server-rendered into
the first HTML with zero CLS; live state is read via auto-imported
composables (`useConsentActiveUI`, `useHasConsent`, `useConsentInit`).

Try the region preview from the page itself, or by hand — `?country=DE`
resolves GDPR/opt-in with a banner, `?country=US&region=CA` resolves
CCPA/opt-out with no banner at all. The resolved jurisdiction, policy pack and
surface are shown on the page so you can see the manifest re-resolve.

## Storage

Selection lives in `lib/adapter.ts`, shared by the server route and the CLI
config. Both modes are Postgres — only the destination changes:

- **Local dev** — [PGlite](https://pglite.dev), Postgres compiled to WASM,
  running in-process with its data directory in `.pgdata/`. Gitignored,
  created and migrated on first request, so `bun run dev` needs zero setup.
- **Deployed** — Postgres via `DATABASE_URL`. Deploys fail fast without it
  rather than falling back to an embedded database a read-only filesystem
  can't write. Migrate with `bun run db:migrate`, which runs
  `@c15t/cli self-host migrate` against `c15t-backend.config.ts`.

PGlite rather than SQLite on purpose: SQLite ships with `PRAGMA foreign_keys`
off, so a consent row referencing a policy that doesn't exist inserts happily
locally and only fails once deployed. Running real Postgres in dev means
constraint bugs surface here. Delete `.pgdata/` to reset the demo.

Set `NUXT_PUBLIC_C15T_BACKEND_URL` to point at a hosted c15t instance instead
of the self-hosted route.

The `vite.ssr.noExternal` entry in `nuxt.config.ts` is a workaround for a
`@c15t/vue` packaging issue, not part of the integration — see the comment
there.
