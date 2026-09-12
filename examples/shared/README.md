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
`tanstack-start`, `astro` and `sveltekit`. `src/targets.ts` contains only paths,
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
