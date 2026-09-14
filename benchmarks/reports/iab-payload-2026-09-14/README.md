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

These are data-boundary measurements, not complete framework HTML sizes or
IAB network-latency measurements. A cold browser now makes a separate list
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

## Reproduce

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
