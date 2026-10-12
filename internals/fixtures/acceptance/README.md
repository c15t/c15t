# Runnable example acceptance tests

This private workspace builds the actual examples and tests their production
servers with Vitest and Playwright. It does not recreate their providers in a
test-only application.

Install workspace dependencies and build package dependencies first:

```sh
bun install
bun turbo run build --filter='./packages/*'
bunx playwright@1.61.1 install chromium
bun run --cwd internals/fixtures/acceptance test
```

The default target is `nextjs`, including App Router, Pages Router and its
browser-init alternative. Select one or several examples:

```sh
EXAMPLE_TARGET=react bun run --cwd internals/fixtures/acceptance test
EXAMPLE_TARGET=nuxt,tanstack-start bun run --cwd internals/fixtures/acceptance test
EXAMPLE_TARGET=all bun run --cwd internals/fixtures/acceptance test
```

Targets are `nextjs`, `react`, `vue`, `svelte`, `javascript`, `nuxt`,
`nuxt-prerender`, `nuxt-static`, `nuxt-vapor`, `nuxt-vapor-future`,
`tanstack-start`, `tanstack-start-streamed`,
`tanstack-start-same-origin`, `tanstack-start-static`, `astro`, `astro-static`,
`sveltekit` and `html`. `astro-static` builds the Astro demo as a static site
with no adapter, so every page is prerendered. `nuxt` also runs the journeys on
a prerendered route and a Nitro-cached route; `nuxt-prerender` runs those two
routes in client manifest mode. `nuxt-static` runs `nuxt generate` with
`ssr: false` and client manifest mode, then serves `.output/public` with no
Nuxt server. `nuxt-vapor` runs the journeys on `/consent-example` and
`/headless` in `internals/fixtures/nuxt-vapor`, where every app component is a Vue Vapor
component, and `nuxt-vapor-future` repeats them under the Nuxt 5 preview. The
`tanstack-start-*` targets build the TanStack Start example
with one of the alternative root routes in
`internals/fixtures/tanstack-start/src/rendering`. The `vue` target also runs every
journey against `/headless`, which replaces the stock consent UI with the
composables. `src/targets.ts` contains only paths,
commands and environment aliases. No framework provider is implemented here.
Every run builds again because public backend URLs contain the fixture's port.
The build uses test vendor IDs, never account credentials.

The backend reuses `internals/next-compat/shared/src/fixture` with one opt-in
policy covering measurement and marketing. A controllable outage tests both
server prefetch failure and browser recovery. The tests intercept PostHog and X
SDKs and serve a local YouTube iframe document. Every other external browser
request is blocked and reported, including telemetry requests.

Each example must expose:

- A `Consent example` heading and a persistent `Privacy settings` control.
- Standard accept, reject and save actions, plus accessible Measurement and
  Marketing checkboxes or switches.
- A measurement-gated iframe titled `YouTube video`.
- PostHog in `after-consent` mode, and X Pixel gated by marketing.
- A Branded design button or link that changes the example's actual presentation.

Tests cover fresh denial, rejection and reload, footer reopening, partial
choices, grant, revocation, design selection, navigation, and failed init.
They verify SDK requests and iframe presence, not claims about a real vendor's
tracking implementation. SDKs already loaded cannot be unloaded by deleting
script tags, so revocation assertions focus on consent callbacks and iframe
removal rather than pretending prior code has disappeared.

Failed tests save a screenshot and Playwright trace under `artifacts/<target>`.
Open a trace with `bunx playwright@1.61.1 show-trace <path>`. Artifacts may contain
rendered test pages but no production consent data or vendor account secrets.

The existing `internals/next-compat` matrix remains responsible for Next 15/16
and Cache Components build contracts. This suite adds real example workflows;
it does not replace that compatibility coverage.

## Starter smoke tests

`bun run --cwd internals/fixtures/acceptance test:starters` builds each
starter in `examples/` for production, starts it, and checks that the banner
shows, that Accept survives a reload, and that Privacy settings opens the
dialog. Server-rendered starters must also have the banner in their first
HTML, which the test reads with JavaScript disabled. Select starters with
`STARTER_TARGET=react,nuxt`; the default is `all`. The full journeys above
stay with the apps in `internals/fixtures`.

`src/starter-targets.ts` holds each starter's directory, commands, routes and
how it reaches the fixture. Server-rendered starters read their public backend
URL variable. Client-only starters hardcode `https://your-project.inth.app`,
so the test routes those browser requests to the fixture, and serves the HTML
starter's jsDelivr script from `packages/browser/dist`. `self-host` needs
PostgreSQL in production, so the test starts a throwaway container with
Docker. To cover a showcase, add a target and let `scripts/ci-plan.ts` select
its directory.

## SSR consent journeys

`bun run --cwd internals/fixtures/acceptance test:ssr` runs the production Next, Nuxt and
SvelteKit benchmark hosts through first-HTML, persistence, GPC, language,
request-header and no-zombie-banner contracts. The Nuxt cases also check
Nitro route methods, caching and version headers. Next cases also verify the
backend receives one saved choice, with one init request for hosted SSR and
zero for manifest SSR. Select hosts with
`C15T_E2E_APPS=nextjs,nuxt`. `bun run e2e:consent` calls the same suite.

These journeys use benchmark hosts because they expose server observations
that the public examples do not. Example acceptance owns vendor gating and
outage recovery. Shared server startup and process cleanup live in
`scripts/browser-process.ts`. Failed journeys retain screenshots and traces
under `.ci-reports/`.

## Docs code comes from elsewhere

These apps carry test hooks, so the docs publish nothing from them. Setup code
in `docs/` comes from `#region docs:` markers in the starters under
`examples/`, which the starter smoke tests cover, and in
`internals/doc-snippets/<framework>`, which CI type-checks. See
`examples/README.md` and the `writing-docs` skill; the marker syntax is
documented in `scripts/example-doc-sources.ts`.

The one exception runs the other way: the `script-tag` fixture serves the HTML
regions from `internals/doc-snippets/html` on its branded, Tailwind and
headless routes, so the HTML journeys test the markup readers copy.

`scripts/example-doc-sources.test.ts` fails when a generated snippet is stale
or orphaned. It also counts hand-written docs fences that import c15t against
`scripts/hand-written-examples-baseline.json`; that count may only fall. Put
`{/* example: fragment */}` on the line before a fence that is deliberately a
partial edit rather than a file, such as one changed prop. When you move or
rename a page, move its baseline entry with it.
