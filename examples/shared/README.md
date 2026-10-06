# Runnable example acceptance tests

This private workspace builds the actual examples and tests their production
servers with Vitest and Playwright. It does not recreate their providers in a
test-only application.

Install workspace dependencies and build package dependencies first:

```sh
bun install
bun turbo run build --filter='./packages/*'
bunx playwright@1.61.1 install chromium
bun run --cwd examples/shared test
```

The default target is `nextjs`, including App Router, Pages Router and its
browser-init alternative. Select one or several examples:

```sh
EXAMPLE_TARGET=react bun run --cwd examples/shared test
EXAMPLE_TARGET=nuxt,tanstack-start bun run --cwd examples/shared test
EXAMPLE_TARGET=all bun run --cwd examples/shared test
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
`/headless` in `examples/nuxt-vapor`, where every app component is a Vue Vapor
component, and `nuxt-vapor-future` repeats them under the Nuxt 5 preview. The
`tanstack-start-*` targets build the TanStack Start example
with one of the alternative root routes in
`examples/tanstack-start/src/rendering`. The `vue` target also runs every
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

## SSR consent journeys

`bun run --cwd examples/shared test:ssr` runs the production Next, Nuxt and
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

## Publish example code in the docs

Setup code in `docs/` comes from these apps, so the docs show code that builds
and passes the journeys above. Mark the lines to publish with a named region in
the file's own comment syntax:

```tsx
// #region docs:app-router-layout
export default function RootLayout({ children }: { children: ReactNode }) {
	…
}
// #endregion docs:app-router-layout
```

```vue
<!-- #region docs:root title="app/app.vue" -->
<ConsentRoot />
<!-- #endregion docs:root -->
```

Then run `bun scripts/sync-example-docs.ts`. Each region becomes
`docs/shared/examples/<app>/<name>.mdx`, a titled code fence that a page
includes with `<include src="../../shared/examples/<app>/<name>.mdx" />`.
The fence title defaults to the file's path inside the app; set `title` when
readers use a different path. Regions can nest, and nested markers are removed
from the outer snippet. `internals/next-compat` apps can publish regions too,
and so can the Storybook apps in `apps/storybook-*`: a region in
`apps/storybook-react` becomes `docs/shared/examples/storybook-react/<name>.mdx`.

Keep demo-only code, such as the design gallery, reset buttons and location
overrides, outside published regions or in separate files. A region should be
something a reader can copy into their app unchanged.

When demo-only code has to sit inside a region, hide it from the snippet. End
one line with a `docs:hide` comment in the file's syntax (`// docs:hide`,
`/* docs:hide */`, `<!-- docs:hide -->` or `{/* docs:hide */}`), or wrap
several lines in `#hide docs` and `#endhide docs` markers:

```js
c15t({
	mode: hosted({ url: backendURL }),
	// #hide docs
	vendors: exampleVendors,
	// #endhide docs
}),
```

The app still runs the hidden lines; only the published snippet leaves them
out. A region nested inside a hide block still publishes on its own, so one
file can keep a quickstart minimal and show the hidden option on another page.

`scripts/example-doc-sources.test.ts` fails when a generated snippet is stale
or orphaned. It also counts hand-written docs fences that import c15t against
`scripts/hand-written-examples-baseline.json`; that count may only fall. Put
`{/* example: fragment */}` on the line before a fence that is deliberately a
partial edit rather than a file, such as one changed prop. When you move or
rename a page, move its baseline entry with it.
