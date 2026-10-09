# v3 API polish baseline

First-load client payload of every starter in `examples/` at `b410db25f`, the
revision the v3 API polish gate compares against, and at `v3-dx`. Later work
must not grow any example's first-load JavaScript past these numbers.

## Method

`benchmarks/examples-payload/run.ts` builds each example with its own `build`
script, starts it with its own `start` script and loads `/` in Chromium.
Examples are never copied between checkouts: `--root` points the harness at
another worktree, which builds and serves its own examples.

- A fixture backend serves `/manifest` and `/init` from the measured
  checkout's `buildBrowserBenchManifest()` (Europe opt-in plus a world
  default, resolved for Germany), plus `POST /subjects` and `/c15t.js` with
  the hosted prelude `@c15t/backend` adds.
- `NEXT_PUBLIC_`, `NUXT_PUBLIC_`, `VITE_` and `PUBLIC_C15T_BACKEND_URL` point
  at it for both the build and the server. Real environment variables win
  over `.env` files and the `?? 'https://benchmarks-inth.inth.app'`
  fallbacks the `b410db25f` examples use. Every example that downloads its
  policy at build time fetched `/manifest` from the fixture
  (`buildBackendRequests` in `examples-payload.json`).
- `*.inth.app`, hard-coded in `astro-static`, `nuxt-static` and `html`, is
  routed to the fixture with `page.route`. Other internet hosts are blocked
  and listed in the notes. The only one is PostHog's CDN, which the examples'
  PostHog snippet requests after Accept.
- Each phase runs in a fresh browser context. `initial` lasts until network
  idle after load and the banner showing. `dialog` is what clicking Customize
  adds. `accept` is what clicking Accept adds, in a second context, until the
  save answers. Sizes are response bodies with Node zlib defaults per asset.
- Boundary bytes are the gzip sizes of first-load JS assets that contain a
  marker string. Examples ship no source maps, so a marker counts its whole
  chunk. The gate only needs zero or not zero. Markers: the fixture
  manifest's revision and unresolved policy fingerprint (snapshot),
  `createManifestTransport: either` (resolver), `quebec_opt_in` (offline
  policy), the German and French banner titles (other languages),
  `__tcfapi` (IAB) and `c15t-dev-tools__` (devtools).

Run on macOS arm64, Node 24.21.0, Chromium 149.0.7827.55, fixture latency
0 ms. `bannerVisibleMs` is the median of 5 local loads and is reported only.

```sh
git worktree add --detach ../c15t-b410 b410db25f
bun install --cwd ../c15t-b410 --frozen-lockfile
bun run --cwd ../c15t-b410 build:libs
bunx tsx benchmarks/examples-payload/run.ts --root ../c15t-b410 \
  --out .benchmarks/base/examples-payload
bun run build:libs
bunx tsx benchmarks/examples-payload/run.ts --root . \
  --out .benchmarks/head/examples-payload
BENCHMARK_BASE_DIR=.benchmarks/base/examples-payload \
BENCHMARK_HEAD_DIR=.benchmarks/head/examples-payload \
BENCHMARK_COMPARE_DIR=.benchmarks/compare/examples-payload \
BENCHMARK_EXPECTED_SUITES=examples-payload BENCHMARK_PROFILE=regression \
bun run bench:compare
```

## First-load JavaScript

`v3-dx` was measured at `bce619034`, which is `v3-dx` (`47148b7f2`) plus a
benchmark-only build fix. Bytes:

| Example | Kind | gzip `b410db25f` | gzip `v3-dx` | Δ | brotli `b410db25f` | brotli `v3-dx` | Δ |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| nextjs | server | 262,370 | 262,487 | +117 | 226,828 | 226,890 | +62 |
| nextjs-pages-router | server | 229,534 | 229,722 | +188 | 199,717 | 199,778 | +61 |
| nuxt | server | 172,674 | 172,674 | 0 | 152,447 | 152,447 | 0 |
| nuxt-static | spa | 236,609 | 236,609 | 0 | 205,302 | 205,302 | 0 |
| tanstack-start | server | 210,461 | 210,270 | −191 | 180,454 | 180,201 | −253 |
| astro | server | 74,524 | 74,539 | +15 | 65,148 | 65,146 | −2 |
| astro-static | server | 81,257 | 81,275 | +18 | 71,045 | 71,062 | +17 |
| react | spa | 149,629 | 149,645 | +16 | 127,144 | 127,054 | −90 |
| javascript | spa | 117,774 | 117,803 | +29 | 100,024 | 100,047 | +23 |
| html | spa | 96,296 | 96,296 | 0 | 81,025 | 81,025 | 0 |
| vue | spa | 198,888 | 199,044 | +156 | 172,870 | 172,962 | +92 |
| svelte | spa | 137,288 | 137,320 | +32 | 117,873 | 117,956 | +83 |
| sveltekit | server | 150,569 | 150,572 | +3 | 132,146 | 132,217 | +71 |

`v3-dx` is within 200 B of the baseline everywhere. It is not 0 because
`v3-dx` is more than the build policy: the Next.js catch-all route and
`routePrefix`, the TanStack Start root, the default `manifestURL` in
`@c15t/browser`'s `manifest()` (used by the React, Svelte and JavaScript
examples), `@c15t/vue` changes, and the examples dropping their inline
fallbacks all reach client code. Every boundary that is present is present on both sides.

## Boundaries already in first load at `b410db25f`

These fail the gate's absolute rules today. They are the targets of T2–T8,
not regressions.

| Example | Kind | Boundary | gzip bytes of the carrying chunks |
| --- | --- | --- | ---: |
| nuxt | server | resolver | 82,184 |
| nuxt-static | spa | other languages (and resolver, allowed for an SPA) | 149,175 |
| javascript | spa | offline policy (and snapshot) | 101,866 |
| vue | spa | other languages | 68,511 |
| vue | spa | resolver, snapshot (allowed for an SPA) | 112,594, 44,083 |

The other server-framework examples carry no snapshot, resolver, offline
policy or other languages in first-load JS, and make no browser manifest
request. No example loads IAB or devtools code.

## Bundle entries at `b410db25f`

`bunx tsx benchmarks/bundle-test-app/analyze-entries.ts` in the base
checkout. Bytes:

| Entry | `initialGzip` | `reachableLazyGzip` | `allLocalesInputBytes` |
| --- | ---: | ---: | ---: |
| ordinary-react | 80,792 | 44,150 | 0 |
| provider | 53,045 | 20,401 | 0 |
| browser-full | 100,426 | 22,980 | 0 |
| browser-headless | 73,167 | 17,115 | 0 |
| manifest-transport | 80,231 | 0 | 225 |

## Files

- `base-b410db25f/examples-payload/`: one gate result per example, the full
  detail with every asset (`examples-payload.json`) and the Markdown table.
- `base-b410db25f/bundle-entries/`: every bundle entry result.
- `head-v3-dx/examples-payload/`: the same run at `v3-dx`.
- `compare/`: `bench:compare` output for `v3-dx` against the baseline.
