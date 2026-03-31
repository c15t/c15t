# c15t Benchmarks

This directory contains the internal benchmark platform for `c15t`, `@c15t/react`, and `@c15t/nextjs`.

## Suites

- `core-benchmarks`
  Measures framework-agnostic runtime work such as store creation, `has()`, cookie round-trips, init, repeat-visitor init, and script updates.
- `bundle-test-app`
  Builds a dedicated Next app and records route-level client script size plus publish tarball sizes for `c15t`, `@c15t/react`, and `@c15t/nextjs`.
- `react-browser-bench`
  Runs Playwright against a React-flavoured benchmark app with local deterministic API routes.
- `nextjs-browser-bench`
  Runs Playwright against a Next integration benchmark app covering client, prefetch, SSR, and repeat-visitor paths.
- `script-lifecycle-bench`
  Runs deterministic local script lifecycle flows for load, unload, reload, callback-only, `alwaysLoad`, and `persistAfterConsentRevoked` behavior.
- `shared`
  Shared schema, fixtures, budgets, comparison logic, and report formatting.

## Outputs

Benchmark tasks write machine-readable JSON to:

- `.benchmarks/current/**`
- `.benchmarks/head/**`
- `.benchmarks/nightly/**`
- `.benchmarks/compare/**`

`bun run bench:compare` compares base vs head artifacts and emits:

- `.benchmarks/compare/comparison.json`
- `.benchmarks/compare/comparison.md`

`.benchmarks/` is gitignored so local and CI benchmark artifacts do not dirty the worktree.

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
