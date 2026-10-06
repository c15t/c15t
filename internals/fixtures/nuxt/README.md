# c15t × Nuxt example

c15t Nuxt integration through the `c15t` umbrella package (`c15t/vue` is
`@c15t/vue`). The consent setup is a module entry in a Nuxt layer under
`config/`, `ConsentRoot` and `ConsentPreferencesLink` in `app/app.vue`, and
`scripts` in `app/app.config.ts`. Without a backend URL the demo falls back to a
self-hosted `@c15t/backend` mounted at `/api/self-host`
(`server/api/self-host/[...all].ts`), so it also runs from a single origin.

```bash
bun install
bun run dev
```

`manifest: 'server'` enables same-origin, CDN-cacheable consent resolution — the
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

The demo shell in `nuxt.config.ts` sets `backendURL` to the self-hosted route,
overriding the placeholder in the `config/` layers. The acceptance suite sets
`NUXT_PUBLIC_C15T_BACKEND_URL` to point the demo at its mock backend instead.

## Consent example

Open `/consent-example` for the shared integration scenario. The existing home
and showcase routes remain available.

`/prerendered/consent-example` is the same page prerendered at build time, and
`/cached/consent-example` is the same page cached by Nitro (`swr`). Every
visitor gets the same HTML there, so it renders without the banner and the
browser resolves the visitor's policy and stored choice after hydration. Set
`C15T_NUXT_MANIFEST=client` at build time to run the demo in client manifest
mode.

For hosted operation, create an [Inth](https://inth.com) project, configure an
opt-in policy covering `measurement` and `marketing`, and allow this app's
origin. Set `NUXT_PUBLIC_C15T_BACKEND_URL` to the backend URL supplied by Inth,
or copy the layer config into your own app and replace
`https://your-project.inth.app` there. Then run from the repository root:

```sh
bun run --cwd internals/fixtures/nuxt dev
```

Replace the vendor placeholders in `app/consent-scripts.ts`:

- `phc_your_project_key`: PostHog browser project key. The example selects the
  EU region; change `region` for a US project.
- `your-pixel-id`: X Pixel ID, not a conversion event ID.

PostHog uses `loadMode: 'after-consent'` and `cookieless_mode: 'never'`. X Pixel waits for marketing permission. Remove
other initializers for these vendors before reusing the example.

The YouTube nocookie iframe in `app/components/VideoEmbed.vue` only mounts with
measurement permission and is removed on revocation. The placeholder opens
preferences. Use the footer's Privacy settings control to reopen the dialog.
Default theme and Branded theme buttons demonstrate CSS token overrides
without replacing the consent runtime.

Test a fresh rejection, grant, reload and withdrawal. Confirm PostHog and X
requests are absent before their respective permissions, and the iframe is
absent before measurement permission. Script removal cannot undo SDK code that
already ran; application event calls must also stop after withdrawal.

## Banner experiment

Module config is static, so the banner-shape experiment is switched on at
build time. Run `C15T_NUXT_EXPERIMENT=1 bun run --cwd internals/fixtures/nuxt dev` and
open `/consent-example`: c15t picks the `control` arm (the default banner) or
the `wall` arm, and the page shows `banner-shape · <arm> · c15t` with a
`c15t_surface_shown` and `c15t_choice_recorded` line for each impression and
choice under the arm. `app/components/ExperimentReadout.vue` reads them from the
kernel's `surface:shown` and `choice:recorded` events and pushes the same
events to `window.dataLayer`. Add `C15T_NUXT_EXPERIMENT_ARM=wall` to set the
arm the way a flag provider would; any other value runs `control`. Both
variables work with `bun run build` and `bun run generate` too. They are not
`NUXT_PUBLIC_*` names because Nitro applies those at runtime over
`runtimeConfig.public.c15t`. See
https://c15t.com/docs/guides/banner-experiments.

## Layout

- `config/server/nuxt.config.ts`: the module with `manifest: 'server'`.
- `config/static/nuxt.config.ts`: `ssr: false` with `manifest: 'client'`,
  used when `C15T_NUXT_OUTPUT=static`. Build it with `bun run generate` and
  serve it with `bun run preview:static`.
- `app/app.config.ts` and `app/consent-scripts.ts`: vendor scripts.
- `nuxt.config.ts`, `app/pages/`, `app/components/ConsentDebugTools.vue` and
  `app/components/ExperimentReadout.vue`: demo shell, region preview,
  development DevTools and the banner experiment.

`EXAMPLE_TARGET=nuxt,nuxt-static bun run --cwd internals/fixtures/acceptance test` runs both
builds through the acceptance journeys.
