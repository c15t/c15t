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

Storage: Postgres when `DATABASE_URL` is set (production/Vercel), otherwise
the committed `c15t.db` SQLite file so local dev needs zero setup. Set
`NUXT_PUBLIC_C15T_BACKEND_URL` to point at a hosted c15t instance instead of
the self-hosted route.
