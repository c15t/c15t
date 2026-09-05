# c15t Benchmarks

This directory contains the internal benchmark platform for `c15t`, `@c15t/react`, and `@c15t/nextjs`.

## Performance Suites

- `core-benchmarks`
  Measures framework-agnostic runtime work such as store creation, `has()`, cookie round-trips, init, repeat-visitor init, and script updates.
- `micro`
  Runs mitata microbenchmarks and emits shared-schema JSON for the regression pipeline.
- `bundle-test-app`
  Builds a dedicated Next app and records route-level client script size plus publish tarball sizes for `c15t`, `@c15t/react`, and `@c15t/nextjs`.
- `react-browser-bench`
  Runs Playwright against a React-flavoured benchmark app with local deterministic API routes.
- `nextjs-browser-bench`
  Runs Playwright against a Next integration benchmark app covering client, prefetch, SSR, and repeat-visitor paths.
- `tanstack-start-browser-bench`
  Runs Playwright against a TanStack Start integration benchmark app with the same fixture, scenarios, and metrics as the Next arm, plus a proxied-save arm. See its README for the head-to-head numbers.
- `script-lifecycle-bench`
  Runs deterministic local script lifecycle flows for load, unload, reload, callback-only, `alwaysLoad`, and `persistAfterConsentRevoked` behavior.
- `shared`
  Shared schema, fixtures, budgets, comparison logic, and report formatting.

## Compatibility Suites

- `css-layer-preview`
  Manual review shell for the shared CSS matrix.
- `tw3-test`
  Tailwind 3 compatibility harness.
- `tw4-test`
  Tailwind 4 compatibility harness.
- `no-tw-test`
  Plain CSS compatibility harness.

## Outputs

Benchmark tasks write machine-readable JSON to:

- `.benchmarks/current/**`
- `.benchmarks/head/**`
- `.benchmarks/nightly/**`
- `.benchmarks/compare/**`

`bun run bench:compare` compares base vs head artifacts and emits:

- `.benchmarks/compare/comparison.json`
- `.benchmarks/compare/comparison.md`

`bun run bench:frameworks` pairs the browser-runtime results of every framework directory under `.benchmarks/current/browser-runtime/` by scenario name and emits:

- `.benchmarks/compare/frameworks.json`
- `.benchmarks/compare/frameworks.md`

`.benchmarks/` is gitignored so local and CI benchmark artifacts do not dirty the worktree.

## Important React v2/v3 Benchmarks

See [`V3.md`](./V3.md) for the current React v3 benchmark notes, reference results, and interpretation.

Use the combined React benchmark runner when comparing the important v2 and v3 browser paths during the React v3 migration:

```bash
bun run bench:important-react -- --iterations 10
```

This runs the following benchmark suites in parallel:

- `react-browser-bench` via `bench:banner-visibility`
  Measures how long it takes for the consent banner to become ready and visible after navigation.
- `script-lifecycle-bench` via `bench:script-count`
  Measures script loading after accepting consent for the configured script counts.

Useful flags:

```bash
bun run bench:important-react -- -i 10 --warmup 1 --script-counts 5,10,25,50
```

- `-i, --iterations <n>` sets measured samples per metric.
- `--warmup <n>` sets warmup samples before measurement.
- `--script-counts <list>` sets the script-count cases for the script loading benchmark.

The combined runner prefixes child process output with `[banner]` and `[scripts]`, exits nonzero if either benchmark fails, and writes the same JSON artifacts as the individual package scripts:

- `.benchmarks/current/banner-visibility/react-v2-v3-banner-visibility.json`
- `.benchmarks/current/script-count/react-v2-v3-script-count.json`

Run the individual suites directly when iterating on one benchmark:

```bash
cd benchmarks/react-browser-bench
BENCH_ITERATIONS=10 bun run bench:banner-visibility

cd ../script-lifecycle-bench
BENCH_ITERATIONS=10 SCRIPT_COUNTS=5,10,25,50 bun run bench:script-count
```

Browser benchmark runners also accept deterministic environment knobs:

```bash
C15T_BENCH_ITERATIONS=1 bun run bench -- --profile none --init-latency-ms 0
C15T_BENCH_ITERATIONS=10 bun run bench -- --profile mobile --init-latency-ms 200
```

- `--profile none|mobile` selects the Playwright CDP throttle profile. `mobile`
  applies 4x CPU throttling and Fast-4G-like network conditions.
- `--init-latency-ms <n>` forwards to `C15T_BENCH_INIT_LATENCY_MS`, making the
  local deterministic init route delay by `n` milliseconds.
- `--cold-manifest true` records manifest scenarios as separate `*-cold` and
  `*-steady` outputs. The server starts with a distinct manifest cache key for
  that run; request 1 is the cold manifest fill and requests 2..N are the
  steady cached path.
- Results record `metadata.profile` and `metadata.initLatencyMs` alongside CLS,
  banner element timing, first-HTML banner presence, and long-task metrics.

Direct-init browser benchmark arms intentionally fetch `/init` with
`cache: "no-store"` so every measured request pays `C15T_BENCH_INIT_LATENCY_MS`.
Manifest arms intentionally keep their framework/server manifest caching: SSR
manifest arms resolve init from the cached server manifest, Next's manifest
client arm fetches the same-origin cached manifest route in the browser, and
Nuxt's client-manifest arm uses the module's same-origin manifest-backed init
route. This asymmetry is the benchmark subject, not a harness accident.

Bundle size is measured separately by `bundle-test-app` because it is build analysis rather than an iteration-based browser runtime benchmark.

## Fixture Model

Shared fixtures live in `shared/src/fixtures.ts`.

- `tiny`, `small`, `medium`, `large`, `xlarge` scale translation payload, script volume, and UI complexity.
- c15t currently exposes five built-in consent categories, so larger fixtures scale primarily via translation/script complexity rather than additional category names.
- `core-benchmarks` measures script-manager reconciliation speed only. It does not measure remote third-party script latency.
- Browser startup benches expose app-startup script waterfall metrics, not CDN speed for third-party scripts.
- `script-lifecycle-bench` is the source of truth for actual load/unload/reload consent flow timings.

## Still Unbenchmarked

The current platform still leaves a few areas intentionally out of scope:

- IAB-gated script lifecycle scenarios
- Remote CDN latency and real third-party network variance
- Memory and retained-heap behavior after repeated mount/unmount cycles
- Artifact file-count and brotli-size reporting
- Per-framework script lifecycle hosts for Vue, Svelte, and Solid

## Framework Adapter Contract

Future framework benchmark apps should follow the same shape as the React and Next apps.

Each framework benchmark app should provide:

- routes or pages for `headless`, `full-ui`, `repeat-visitor`, and `vanilla-core`
- `client`, `ssr`, and `prefetch` routes where the framework supports them
- a browser-exposed benchmark object with normalized timing and lifecycle fields
- local deterministic init/subject endpoints or equivalent local fixtures
- mount/render/update probes suitable for that framework runtime

Normalized benchmark state should include:

- `scenario`
- `bannerReadyMs`
- `bannerVisibleMs`
- `mountCount`
- `renderCount` or equivalent reactive update count
- interaction timings
- request counts
- error count if the framework-specific harness exposes it

## CI

- `benchmark-regression.yml`
  Runs on performance-sensitive PRs and on pushes to `main` and `canary`.
- `benchmark-comment.yml`
  Posts a sticky PR comment from regression artifacts.
- `benchmark-nightly.yml`
  Stores nightly raw benchmark artifacts for trend inspection.

The current rollout is report-first. Hard failures can be enabled by setting the repository variable `C15T_BENCHMARK_ENFORCE=true`.

Bundle benchmarks protect route-level client JavaScript size. Artifact benchmarks protect publish-size growth for the shipped packages.
IAB-gated script lifecycle coverage is intentionally not included in v1 of the script lifecycle suite.
