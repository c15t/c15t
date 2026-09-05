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
- `script-lifecycle-bench`
  Runs deterministic local script lifecycle flows for load, unload, reload, callback-only, `alwaysLoad`, and `persistAfterConsentRevoked` behavior.
- `core-benchmarks` (`policy-runtime` suite)
  Measures what the installed schema package emits for fixed preset deployments: manifest and init JSON, gzip, and brotli bytes, synchronous policy resolution, init resolution from a manifest, and kernel init with the resolved payload. Fixtures live in `shared/src/policy-fixtures.ts`.
- `react-browser-bench` (`policy-*` scenarios)
  Loads `/policy/<fixture>` against an init route that resolves the fixture through the installed schema package, then records prompt readiness, probe render count, request and console-error invariants, the cookie and localStorage bytes the browser holds after an explicit choice or notice dismissal, and, for the persisted repeat visitor, the synchronous persistence hydration cost against the real stored record.
- `nextjs-browser-bench` (`ssr-repeat` scenario and SSR consistency metrics)
  Adds a persisted repeat visitor over the SSR route plus `consoleErrorCount`, `hydrationWarningCount`, `promptTransitionCount`, and `promptShownCount` for every scenario, so matching server and client inputs must settle on the same prompt without a flash or a hydration warning.
- `bundle-test-app` (`bench:entries`, `ordinary-react` entry)
  Builds a synthetic esbuild entry for the ordinary non-IAB React path and reports `iabInputBytes`, `devtoolsInputBytes`, and `allLocalesInputBytes` from the metafile so the import boundary is measured, not assumed.
- `shared`
  Shared schema, fixtures, budgets, expected-result registry, comparison logic, and report formatting.

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
- `.benchmarks/compare/summary.json` with exact coverage counts

`.benchmarks/` is gitignored so local and CI benchmark artifacts do not dirty the worktree.

Every result records `commitSha` (from CI variables or `git rev-parse HEAD`) and `metadata.gitDirty`, so an artifact cannot silently claim a commit its working tree did not match.

## Comparison gate

The gate fails, with `BENCHMARK_ENFORCE=true`, on anything that would otherwise let it pass without measuring:

- an expected result key (`shared/src/expected-results.ts`) has no head artifact or no base artifact;
- a head artifact defines fewer budgets than expected for its key;
- a relative budget (`delta-bytes-lte`, `percent-lte`, `absolute-and-percent-lte`) has no base metric, or its base median is `0` while the head median is not;
- a budget that targets a named base arm has no arm artifacts and the arm was not explicitly allowed;
- any evaluated budget fails.

`summary.json` reports expected, compared, missing, evaluated, passed, failed, and unevaluated counts. A final report must quote those counts rather than "no failures".

Environment:

- `BENCHMARK_BASE_DIR`, `BENCHMARK_HEAD_DIR`, `BENCHMARK_COMPARE_DIR`
- `BENCHMARK_EXPECTED_SUITES=core-runtime,policy-runtime` restricts the expectation to the suites a partial local run produced. Omit it for a full gate.
- `BENCHMARK_ARM_BASE_DIRS=v2=/path/to/v2-artifacts` supplies artifacts for a named base arm.
- `BENCHMARK_ALLOW_UNEVALUATED_ARMS=v2` lets arm budgets stay unevaluated. The waiver is recorded in `summary.json` and the markdown report.

### Base arms

`coreRuntimeV3Budgets` are v3-over-v2 improvement thresholds (0% / -50% / -50%) documented in `BASELINE.md`. They carry `baseArm: 'v2'` and are only evaluated against artifacts supplied through `BENCHMARK_ARM_BASE_DIRS`. Comparing them against a v3 base as if it were v2 would either fail spuriously or pass against an implicit zero, so without v2 artifacts the runner reports them as unevaluated. Same-key regression ceilings (`coreRuntimeBudgets`, `coreRuntimeCoverageBudgets`) always run against the real base.

### Budget kinds

- Relative ceilings compare head to the same-key base artifact.
- `absolute-lte` budgets are explicit allowances for behavior that has no pre-change counterpart (for example notice-dismissal storage bytes). Each one states its justification in its description; none is tuned to a head measurement.
- `count-eq` budgets are invariants (request counts, console errors, prompt shown or not, import boundary bytes).

The `#1025` budgets in `shared/src/budgets.ts` say whether each threshold was measured from the pre-change base capture or declared as an allowance.

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
- Policy fixtures (`shared/src/policy-fixtures.ts`) are built from the schema package's own preset builders and resolve the same semantic deployment on either side of the policy-rule contract: `optin-choice-eu` (Europe opt-in + world default, German visitor), `optout-california` (California opt-out + world default, Californian visitor), and `optout-default-world` (three packs resolving to the world default, Brazilian visitor). The runner asserts the intended preset matched so a fixture cannot degrade into the empty fallback.
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
