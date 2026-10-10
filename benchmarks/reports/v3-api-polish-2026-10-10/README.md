# v3 API polish gate, 2026-10-10

First-load client payload and banner visibility of every starter in
`examples/` at `v3-dx` (`4add1f511`), against the `b410db25f` baseline in
`../v3-api-polish-baseline/`.

## Result

- **First-load JavaScript:** every example is smaller than the baseline in
  gzip and brotli, in both runs. Both runs measured the same bytes.
- **Boundaries:** no server-framework example carries the snapshot, the
  resolver, the offline policy or another language in first-load JS, and none
  requests the manifest. No single-page app carries the offline policy or
  another language. No example loads IAB or devtools code.
- **One budget fails:** `vue` makes one cross-origin request on a first visit,
  where the baseline made none. See [Vue](#vue).

## Method

Same harness, fixture and environment as the baseline (see its README):
`benchmarks/examples-payload/run.ts` builds each example with its own `build`
script, starts it with its own `start` script and loads `/` in headless
Chromium against a fixture backend serving the checkout's
`buildBrowserBenchManifest()` (Europe opt-in plus a world default, resolved
for Germany).

Run on macOS arm64, Node 24.21.0, Chromium 149.0.7827.55, fixture latency
0 ms for the payload runs.

```sh
bun run build:libs
bunx tsx benchmarks/examples-payload/run.ts --root . \
  --out .benchmarks/head-1/examples-payload
bunx tsx benchmarks/examples-payload/run.ts --root . \
  --out .benchmarks/head-2/examples-payload
BENCHMARK_BASE_DIR=benchmarks/reports/v3-api-polish-baseline/base-b410db25f/examples-payload \
BENCHMARK_HEAD_DIR=.benchmarks/head-1/examples-payload \
BENCHMARK_COMPARE_DIR=.benchmarks/compare-1 \
BENCHMARK_EXPECTED_SUITES=examples-payload BENCHMARK_PROFILE=regression \
bun run bench:compare
```

Each run built every example from scratch. The second run's checkout shows
`-dirty` because the Next.js builds rewrite the tracked `next-env.d.ts`.

The baseline was measured again today from a `b410db25f` worktree with this
harness (`base-b410db25f-recheck/`). It is within 100 B of the committed
baseline for every example, and identical for nuxt, nuxt-static,
tanstack-start, react, javascript, html and vue. The gate compares against the
committed baseline.

## First-load JavaScript

Bytes. Δ is head minus base; both runs are identical.

| Example | Kind | gzip `b410db25f` | gzip run 1 | gzip run 2 | Δ | brotli `b410db25f` | brotli run 1 | brotli run 2 | Δ |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| nextjs | server | 262,370 | 233,665 | 233,665 | −28,705 | 226,828 | 201,184 | 201,184 | −25,644 |
| nextjs-pages-router | server | 229,534 | 201,022 | 201,022 | −28,512 | 199,717 | 173,905 | 173,905 | −25,812 |
| nuxt | server | 172,674 | 162,115 | 162,115 | −10,559 | 152,447 | 142,593 | 142,593 | −9,854 |
| nuxt-static | spa | 236,609 | 177,031 | 177,031 | −59,578 | 205,302 | 155,406 | 155,406 | −49,896 |
| tanstack-start | server | 210,461 | 185,241 | 185,241 | −25,220 | 180,454 | 158,237 | 158,237 | −22,217 |
| astro | server | 74,524 | 69,278 | 69,278 | −5,246 | 65,148 | 60,547 | 60,547 | −4,601 |
| astro-static | server | 81,257 | 77,158 | 77,158 | −4,099 | 71,045 | 67,404 | 67,404 | −3,641 |
| react | spa | 149,629 | 146,078 | 146,078 | −3,551 | 127,144 | 124,111 | 124,111 | −3,033 |
| javascript | spa | 117,774 | 96,377 | 96,377 | −21,397 | 100,024 | 82,496 | 82,496 | −17,528 |
| html | spa | 96,296 | 96,159 | 96,159 | −137 | 81,025 | 80,925 | 80,925 | −100 |
| vue | spa | 198,888 | 117,856 | 117,856 | −81,032 | 172,870 | 103,233 | 103,233 | −69,637 |
| svelte | spa | 137,288 | 129,101 | 129,101 | −8,187 | 117,873 | 110,519 | 110,519 | −7,354 |
| sveltekit | server | 150,569 | 146,387 | 146,387 | −4,182 | 132,146 | 128,127 | 128,127 | −4,019 |

The code that saves consent now loads after first load, so `acceptJsGzip`
grows by about 3.9 KB gzip in most examples, and the examples whose dialog
used to be in first load (`nextjs`, `nextjs-pages-router`, `tanstack-start`)
now load it on Customize, about 25 KB gzip. React's `acceptJsGzip` falls from
24,820 to 3,908.

## Boundaries and requests

Gzip bytes of the first-load JS assets that contain each marker. Both runs are
identical.

| Example | Kind | snapshot | resolver | offline policy | other languages | IAB | devtools | init | manifest | cross-origin `b410db25f` → head |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| nextjs | server | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 → 0 |
| nextjs-pages-router | server | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 → 0 |
| nuxt | server | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 → 0 |
| nuxt-static | spa | 92,639 | 18,750 | 0 | 0 | 0 | 0 | 1 | 0 | 1 → 1 |
| tanstack-start | server | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 → 0 |
| astro | server | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 → 0 |
| astro-static | server | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 → 1 |
| react | spa | 137,901 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 → 1 |
| javascript | spa | 84,451 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 → 1 |
| html | spa | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 2 → 2 |
| vue | spa | 67,322 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 → 1 |
| svelte | spa | 100,121 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 → 1 |
| sveltekit | server | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 → 0 |

A single-page app bundles the snapshot by design, and `nuxt-static` resolves
in the browser (`manifest({ resolve: 'browser' })`), so it bundles the
resolver too. Examples ship no source maps, so a marker counts its whole
chunk. The baseline's absolute boundary failures (nuxt resolver, nuxt-static
and vue other languages, javascript offline policy) are all gone.

## Banner visibility

`bannerVisibleMs` is the page time at which the banner root first passes
`checkVisibility()`. The harness records no separate paint metric. Fixture
latency 200 ms. Each example ran three rounds of 5 samples per side, in the
order base-head, head-base, base-head, from builds of each checkout's own
examples (`run.ts --skip-build --banner-samples 5 --backend-latency-ms 200`),
then pooled: 15 samples per side. Raw samples are in
`banner-visibility/summary.json`.

| Example | median `b410db25f` | median head | Δ | p95 `b410db25f` | p95 head | Δ |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| nextjs | 15 | 15 | 0 | 17.0 | 16.6 | −0.4 |
| nextjs-pages-router | 15 | 15 | 0 | 17.0 | 17.0 | 0.0 |
| nuxt | 15 | 15 | 0 | 17.6 | 16.8 | −0.8 |
| nuxt-static | 253 | 258 | +5 | 257.6 | 260.3 | +2.7 |
| tanstack-start | 13 | 14 | +1 | 15.0 | 16.3 | +1.3 |
| astro | 13 | 13 | 0 | 14.3 | 14.0 | −0.3 |
| astro-static | 238 | 242 | +4 | 245.0 | 247.6 | +2.6 |
| react | 251 | 250 | −1 | 254.3 | 257.3 | +3.0 |
| javascript | 303 | 303 | 0 | 307.9 | 305.3 | −2.6 |
| html | 304 | 306 | +2 | 308.0 | 310.6 | +2.6 |
| **vue** | **43** | **239** | **+196** | **54.6** | **244.6** | **+190.0** |
| svelte | 241 | 239 | −2 | 248.3 | 241.3 | −7.0 |
| sveltekit | 14 | 14 | 0 | 16.0 | 15.0 | −1.0 |

Only `vue` is more than 5 ms slower.

## Vue

The fixture policy depends on the visitor's country. At `b410db25f`, the Vue
plugin's `manifest()` applied the unknown-location rule in the browser without
a request, which can show another region's rules. Since `87f0d852c` it asks
the backend's `/init` in that case, as React, Svelte and `@c15t/browser`
already did. That request is the new cross-origin request, and the banner now
waits one backend round trip (200 ms here), like the other single-page apps.
A page that passes `inputs` or `geoURL`, a policy that doesn't depend on
location, or `initFallback: false` keeps the old timing.

## Files

- `head-4add1f511-run-1/examples-payload/`, `head-4add1f511-run-2/examples-payload/`:
  one gate result per example, the full detail with every asset
  (`examples-payload.json`) and the Markdown table.
- `base-b410db25f-recheck/examples-payload/`: today's measurement of the
  baseline revision.
- `compare/run-1/`, `compare/run-2/`: `bench:compare` output against the
  committed baseline.
- `banner-visibility/summary.json`: every banner sample, base and head.
