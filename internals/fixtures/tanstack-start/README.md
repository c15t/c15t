# c15t × TanStack Start example

A TanStack Start app wired to c15t through the `c15t` umbrella package
(`c15t/tanstack-start`). The files that set it up:

- `src/start.ts` registers `consentRequestMiddleware()`, so every server
  request reads one normalized set of geo, language and GPC headers.
- `src/routes/__root.tsx` declares `getConsentState` with
  `createServerFn().handler(createConsentStateHandler({ backendURL }))`. The
  root loader awaits it on the server, so the banner is in the first HTML.
  `ConsentRoot` reads the result with `Route.useLoaderData()` and, with
  `initRoute={false}`, calls the backend directly from the browser.
- `src/scripts.ts` registers PostHog and X Pixel.
- `src/routes/api/c15t/$.ts` mounts
  `createConsentServerRoute({ backendURL, proxy: true })` for the same-origin
  rendering variant.

```bash
bun install
bun run dev        # http://localhost:3010
```

`bun run dev` uses the self-hosted `@c15t/backend` mounted at
`/api/self-host` (`src/routes/api/self-host/$.ts`). Production builds use the
backend URL written in the root route and the consent server route.

## Rendering variants

`src/rendering` holds alternative root routes. `C15T_TANSTACK_RENDERING`
selects one at build time; the pages stay the same.

| Value | Root route | What changes |
| --- | --- | --- |
| unset | `src/routes/__root.tsx` | The loader awaits consent; the banner is in the server HTML |
| `streamed` | `src/rendering/streamed-root.tsx` | The loader returns the pending consent state; the banner mounts after hydration |
| `same-origin` | `src/rendering/same-origin-root.tsx` | The browser sends init and saves to `/api/c15t` on this origin |
| `static` | `src/rendering/static-root.tsx` | Every page is prerendered; the browser resolves consent |

```bash
C15T_TANSTACK_RENDERING=static bun run build
bun run start:static   # serves dist/client only, like a static host
```

## Banner experiment

`C15T_EXPERIMENT=1` swaps in `src/experiment-root.tsx`, the default root plus
the banner-shape experiment. It cannot be combined with
`C15T_TANSTACK_RENDERING`.

```bash
C15T_EXPERIMENT=1 bun run dev
```

Open `/consent-example?experiment=1`: c15t picks the `control` arm (the
default banner) or the `wall` arm in the browser, and the page shows
`banner-shape · <arm> · c15t`. `/consent-example?experiment=1&arm=wall`
resolves the arm in the root loader, on the server, where a flag provider's
answer would go. The server function passes it to
`resolveConsent({ experiment })`, which counts the arm through `/init` and
returns the experiment in the state, so `ConsentRoot` needs no `experiment`
option. Any other `arm` value runs `control`. The root's `onSurfaceShown` and
`onChoiceRecorded` callbacks list each impression and choice under the arm and
push them to `window.dataLayer` as `c15t_surface_shown` and
`c15t_choice_recorded`. See https://c15t.com/docs/guides/banner-experiments.

## Demo files

`src/demo` holds the demo pages' components and CSS, and the IAB banner the
home page shows for the self-hosted backend's IAB policy. Try the region
preview from the home page, or by hand: `?country=DE` resolves the IAB
policy, `?country=US&region=CA` resolves an opt-out policy with no banner.
`scripts/region-preview.mjs` turns the query into geo headers in the dev
server and in `scripts/serve.mjs`, outside the app. Never ship it.

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

Replace `https://your-project.inth.app` in the root routes and
`src/routes/api/c15t/$.ts` with the backend URL from your
[Inth](https://inth.com) project, and add this app's origin to the project's
trusted origins.

`VITE_C15T_BACKEND_URL` overrides that URL without editing the files.
`src/test-backend.ts` applies it; `bun run dev` and the acceptance suite use
it.

## Production build

```bash
bun run build
bun run start
```

To build against the self-hosted route instead, set
`VITE_C15T_BACKEND_URL=/api/self-host` and `DATABASE_URL`.

`vite build` emits `dist/server/server.js` as a bare `{ fetch }` handler with
no listener, so `bun run start` hosts it with `scripts/serve.mjs`: srvx on
`node:http` serving `dist/client` as static files in front of the handler,
which is the Node hosting shape TanStack Start documents for that output.
`PORT` and `HOST` override the defaults (`3010`, `127.0.0.1`).

## Consent example

Open `/consent-example` for the shared integration scenario. Replace the
vendor placeholders in `src/scripts.ts`:

- `phc_your_project_key`: PostHog browser project key. The example selects the
  EU region; change `region` for a US project.
- `your-pixel-id`: X Pixel ID, not a conversion event ID.

PostHog uses
`loadMode: 'after-consent'` and `cookieless_mode: 'never'`. X Pixel waits for
marketing permission. The YouTube iframe only mounts with measurement
permission and is removed on revocation. The Default theme and Branded theme
buttons override CSS tokens without replacing the consent runtime.

The shared acceptance suite builds each rendering variant against a fixture
backend:

```sh
EXAMPLE_TARGET=tanstack-start,tanstack-start-streamed,tanstack-start-same-origin,tanstack-start-static bun run --cwd internals/fixtures/acceptance test
```
