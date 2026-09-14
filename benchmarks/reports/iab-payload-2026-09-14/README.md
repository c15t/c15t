# IAB page payload measurement

The full vendor list leaves the serialized page state. The banner keeps the
same summary while the browser loads the list and validates consent.

Measured on an Apple M5 Pro, Node 24.21.0 and Chromium 149.0.7827.55.
The comparison starts from PR #1120 at `6ba1d8d2e`. Its later `d63dcdb4c`
commit changes only an Astro test expectation.

## IAB payload

The captured public GVL has version 176 and 1,211 vendors. Its original JSON
is 854,357 bytes, fetched from `https://gvl.inth.app` with `Accept-Language: en`.
SHA-256: `b9a70e325b468b0a2cf0038643d5e22e6d0a70ada6e62843a5ecd466578f6e5e`.
The compressed fixture is included so the comparison can be repeated after
the live list changes.

| Measurement | Inline list | Reference and summary |
| --- | ---: | ---: |
| Init JSON | 860,567 B | 6,616 B |
| Gzipped init JSON | 106,422 B | 2,631 B |
| Summary preparation, median | <0.001 ms | 0.039 ms |
| JSON serialization, median | 1.038 ms | 0.007 ms |
| Chromium JSON parsing, median | 0.995 ms | 0.005 ms |

This removes 99.23% of the uncompressed init payload and 97.53% of its gzipped
size. Preparation plus serialization falls from about 1.038 to 0.046 ms.
The script asserts that both representations produce identical banner copy.
It measures 200 samples after 20 warmups. Browser parsing uses batches of
20 operations to avoid reporting timer-rounded zeroes.

These are data-boundary measurements. The production page measurements below
cover HTML size and IAB readiness on localhost. A cold browser now makes a separate list
request. The total first-visit transfer still includes the full list, and an
immediate consent action can wait for that request. Fetching begins on mount
rather than on interaction. A warm browser can reuse a cacheable list across
page loads. Hosted init endpoints retain their private cache policy.

## Existing application browser benchmarks

The production TanStack Start `manifest-ssr` and Nuxt `ssr-manifest` scenarios
use ordinary consent policies. They check for startup regressions outside IAB;
they do not measure the additional cold IAB request.

| Median | TanStack before | TanStack after | Nuxt before | Nuxt after |
| --- | ---: | ---: | ---: | ---: |
| TTFB | 5.1 ms | 4.7 ms | 3.5 ms | 3.3 ms |
| HTML complete | 9.9 ms | 10.1 ms | 23.8 ms | 19.8 ms |
| Banner ready | 47.9 ms | 48.7 ms | 35.1 ms | 37.8 ms |
| Interaction latency | 21.82 ms | 21.71 ms | 22.07 ms | 20.28 ms |
| CLS | 0 | 0 | 0 | 0 |
| Long-task time | 0 ms | 0 ms | 0 ms | 0 ms |

Before and Nuxt-after runs contain seven samples after two warmups. TanStack
was repeated with 15 samples after three warmups because its initial after
run had a 15.9 ms HTML-completion median. Both runs contained approximately
10 ms and 16 ms samples; the repeat median was 10.1 ms, with p95 16.0 ms versus
16.2 ms before. The bundled TanStack JavaScript was unchanged at 232,771 B.
The small samples show no clear application regression; they do not establish
identical performance on every device or network.

## Production IAB pages

The same pinned GVL and IAB policy were served to production builds of both
revisions. TanStack uses its manifest SSR route. Nuxt uses hosted SSR because
the parent manifest handler omitted the GVL. Each run contains seven measured
cold/warm browser pairs after two warmup pairs. A warm page reuses the browser
HTTP cache but has no saved consent. Server caches are warm in both arms.
The complete banner text matches before and after in each framework.

| Measurement | TanStack before | TanStack after | Nuxt before | Nuxt after |
| --- | ---: | ---: | ---: | ---: |
| HTML bytes | 952,346 | 14,187 | 1,022,401 | 27,607 |
| HTML gzip bytes | 168,773 | 5,459 | 197,849 | 8,130 |
| Cold TTFB, median | 18.4 ms | 5.3 ms | 31.3 ms | 15.1 ms |
| Cold HTML complete, median | 19.6 ms | 5.6 ms | 32.7 ms | 15.3 ms |
| Cold banner DOM present, median | 26.3 ms | 13.0 ms | 41.0 ms | 22.5 ms |
| Cold CMP loaded, median | 77.2 ms | 57.0 ms | unavailable | 69.8 ms |
| Warm CMP loaded, median | 49.7 ms | 26.9 ms | unavailable | 45.1 ms |
| CLS / long-task time | 0 / 0 ms | 0 / 0 ms | 0 / 0 ms | 0 / 0 ms |

The HTML falls by 98.5% in TanStack and 97.3% in Nuxt. The TanStack list
request transfers 854,657 bytes including headers on the cold page, then
zero bytes on the warm page. Its local server does not compress that route.
Nuxt hosted init retains private/no-store caching, so its browser list fetch
is repeated; cross-origin transfer sizes are opaque to Resource Timing.
The gzip sizes above are computed from captured HTML, not observed wire
compression. Both local production servers serve uncompressed HTML.

These runs found no startup regression. They use localhost without network
or CPU throttling. The additional request still exposes CMP readiness and
very early actions to network latency on a cold browser. Banner DOM presence
is sampled once per animation frame and is not a paint or interaction metric.
Nuxt's parent build never installs the CMP API, so its readiness cannot be
compared as a working baseline. The after run requires a loaded CMP in both
frameworks and rejects browser exceptions.

To repeat this comparison, copy the benchmark's `provider.tsx` and
`manifest-url.ts` into a checkout of #1120. Build package dependencies and
both apps in each checkout. Run the script from the fixed checkout using
Node 24, passing the app checkout to measure. The fixture server uses port
4325; the apps use 4313 and 4314. Run the arms serially.

```sh
C15T_BENCH_IAB=1 bun run --cwd benchmarks/tanstack-start-browser-bench build
bun run --cwd benchmarks/nuxt-browser-bench build
node benchmarks/tanstack-start-browser-bench/scripts/measure-iab-page.ts /path/to/base before /tmp/page-before.json
node benchmarks/tanstack-start-browser-bench/scripts/measure-iab-page.ts /path/to/head after /tmp/page-after.json
```

## Bundle and validation checks

Local CI's bundle comparison measured all 23 expected consumer fixtures.
All 30 bundle budgets passed with no missing measurements. The quick shared
runtime comparison against #1120 passed all 81 budgets across 14 results,
covering core operations, policy resolution and script lifecycles. Its
comparison and summary JSON are included alongside the page measurements. Affected package
builds, type checks and 3,209 tests passed across core, IAB, React, Next.js,
TanStack Start, Vue, Svelte and Astro. Schema tests passed separately.
Repository tooling and docs checks passed all 163 tests after correcting
the Local CI Git wrapper for tests that create temporary repositories.

## Reproduce the data and ordinary-consent benchmarks

Build the relevant packages at each revision before running browser benches.
Run the measurements serially on an idle machine.

```sh
bun turbo run build --filter=@c15t/tanstack-start --filter=@c15t/vue
C15T_BENCH_ITERATIONS=7 C15T_BENCH_WARMUP_ITERATIONS=2 bun run --cwd benchmarks/tanstack-start-browser-bench bench --scenario manifest-ssr
C15T_BENCH_ITERATIONS=7 C15T_BENCH_WARMUP_ITERATIONS=2 bun run --cwd benchmarks/nuxt-browser-bench bench --scenario ssr-manifest
bunx tsx benchmarks/tanstack-start-browser-bench/scripts/measure-iab-payload.ts benchmarks/reports/iab-payload-2026-09-14/gvl-176.json.gz /tmp/iab-payload.json
```

The JSON files alongside this report contain the raw samples. Server-render
conformance covers compact state through React, Next.js, TanStack Start, Vue
and Svelte. IAB tests cover early actions, TC encoding, version mismatch,
explicit disablement and cancellation while loading. The Vue runtime test
checks that Nuxt/Vue mounts the shared CMP and records a TC string.

The broader full browser CI comparison was still running when the draft PR
was published. The completed checks above do not imply a full CI pass.
