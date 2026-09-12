# c15t benchmarks

This directory contains the internal benchmark platform for `c15t`, `@c15t/react`, and `@c15t/nextjs`.

## Performance suites

- `core-benchmarks`
  Measures framework-agnostic runtime work such as store creation, `has()`, cookie round-trips, init, repeat-visitor init, and script updates.
- `micro`
  Runs diagnostic mitata microbenchmarks with `bun run bench:micro`. These are excluded from routine CI because the public-operation runtime suite already covers the release gates.
- `bundle-test-app`
  Builds a dedicated Next app and records route-level client script size plus publish tarball sizes for `c15t`, `@c15t/react`, and `@c15t/nextjs`.
- `react-browser-bench`
  Runs Playwright against a React-flavoured benchmark app with local deterministic API routes.
- `nextjs-browser-bench`
  Runs Playwright against a Next integration benchmark app covering client, prefetch, SSR, and repeat-visitor paths.
- `tanstack-start-browser-bench`
  Runs Playwright against a TanStack Start integration benchmark app with the same fixture, scenarios, and metrics as the Next arm, plus a proxied-save arm. See its README for the head-to-head numbers.
- `nuxt-browser-bench`
  Runs Playwright against a Nuxt app on `@c15t/vue`, covering SSR, client SPA, manifest and repeat-visitor paths plus a zero-consent baseline build.
- `sveltekit-browser-bench`
  Runs Playwright against a SvelteKit app on `@c15t/svelte/kit` (`c15tHandle`, `loadConsent`, `createSvelteKitConsentRouteHandlers`), with the same scenario names as the Nuxt suite and zero-consent baseline routes.
- `astro-browser-bench`
  Runs Playwright against an Astro app on `@c15t/astro`, covering the server-rendered banner in manifest and hosted modes, the `server:defer` banner island, a repeat visitor, and a zero-consent baseline built without the integration.
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

### Consent tax

`sveltekit-browser-bench`, `astro-browser-bench` and `nuxt-browser-bench` all
ship a zero-consent `baseline` arm: the same app shell with no c15t in the
route's module graph. Subtracting it from a measured arm's `bannerVisibleMs`
gives the consent tax — the part of the number that is the library rather than
the host framework — the way the July gate report's "desktop-real" addendum
did it.

## Compatibility suites

- `css-layer-preview`
  Manual review shell for the shared CSS matrix.
- `tw3-test`
  Tailwind 3 compatibility harness.
- `tw4-test`
  Tailwind 4 compatibility harness.
- `no-tw-test`
  Plain CSS compatibility harness.

## CI comparisons

```sh
BENCHMARK_BASE_REF=origin/canary bun scripts/benchmark-run.ts bundle
BENCHMARK_BASE_REF=origin/canary bun scripts/benchmark-run.ts quick
BENCHMARK_BASE_REF=origin/canary bun scripts/benchmark-run.ts full
```

The runner creates an isolated checkout at the exact base revision and installs
its frozen lockfile. It overlays the current benchmark fixtures onto that base,
then measures base and head sequentially. Product source and dependency
versions stay specific to each revision. Fixture scripts and exports can change,
but dependency declarations stay at the base revision. A fixture requiring a
dependency absent from the base manifest fails before measurement. `.ci-reports/<mode>/provenance.json`
records both SHAs and the fixture overlay; base, head and comparison evidence
sit alongside it. A failed measurement cannot reuse a previous report.

`bundle` measures real Next route assets, publish tarballs and consumer import
entries. Entry reports separate initial and deferred JavaScript with gzip and
Brotli sizes. Route reports also measure CSS. The ordinary React entry checks
that IAB, devtools and all locales have not entered its module graph. Missing
or empty assets fail the run.

`quick` covers core operations, policy resolution and script lifecycle with
15 browser samples after 3 warmups. Engine operations use 5,000 samples after
1,000 warmups in both profiles. `full` uses 30 browser samples and adds React, Next, Nuxt,
SvelteKit, Astro and TanStack Start browser scenarios. PRs run the quick
comparison when runtime benchmark consumers are affected. Full CI runs the
browser comparison on publishing branches and nightly. Results and failures
appear in Actions summaries and artifacts, without PR comments. Script-lifecycle
durations use the browser clock from action start through confirmed completion;
Playwright click transport and polling time are excluded.

`BENCHMARK_PROFILE=regression` enforces same-revision-key regression budgets
and invariants. `BENCHMARK_PROFILE=release`, the default for `bench:compare`,
also requires historical v2 improvement targets and their real v2 artifacts.
An ordinary v3 PR does not claim to revalidate the v2 targets.

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

`bun run bench:frameworks` pairs the browser-runtime results of every framework directory under `.benchmarks/current/browser-runtime/` by scenario name and emits:

- `.benchmarks/compare/frameworks.json`
- `.benchmarks/compare/frameworks.md`

`.benchmarks/` is gitignored so local and CI benchmark artifacts do not dirty the worktree.

Every result records `commitSha` (from CI variables or `git rev-parse HEAD`) and `metadata.gitDirty`, so an artifact cannot silently claim a commit its working tree did not match.

## Comparison gate

The gate fails, with `BENCHMARK_ENFORCE=true`, on anything that would otherwise let it pass without measuring:

- an expected result key (`shared/src/expected-results.ts`) has no head artifact or no base artifact;
- a head artifact defines fewer budgets than expected for its key;
- a relative budget (`delta-bytes-lte`, `percent-lte`, `absolute-and-percent-lte`) has no base metric, or its base median is `0` while the head median is not;
- a head artifact defines an expected budget with a different comparator, threshold, secondary threshold, or arm mapping (a weaker same-name budget is a mismatch);
- a budget that targets a named base arm has no arm artifacts. There is no waiver: supply the arm or the gate fails;
- any evaluated budget fails.

`summary.json` reports expected, compared, missing, evaluated, passed, failed, unevaluated, missing-definition, and definition-mismatch counts plus the provenance of each supplied base arm. A final report must quote those counts rather than "no failures".

Environment:

- `BENCHMARK_BASE_DIR`, `BENCHMARK_HEAD_DIR`, `BENCHMARK_COMPARE_DIR`
- `BENCHMARK_EXPECTED_PACKAGES=@c15t/core-benchmarks` restricts the expected package set. Unknown or empty selections fail.
- `BENCHMARK_EXPECTED_SUITES=core-runtime,policy-runtime` restricts the expectation to the suites a partial local run produced. Omit it for a full gate.
- `BENCHMARK_ARM_BASE_DIRS=v2=/path/to/v2-artifacts` supplies artifacts for a named base arm. A required arm that is missing fails an enforced release-profile run.

### Base arms

`coreRuntimeV3Budgets` are v3-over-v2 improvement thresholds (0% / -50% / -50%) documented in `BASELINE.md`. They carry `baseArm: 'v2'` and are evaluated only against artifacts supplied through `BENCHMARK_ARM_BASE_DIRS`; the v2 runner named kernel construction `createConsentManagerStore`, which the budget records as `baseArmMetric`. Comparing these budgets against a v3 base as if it were v2 would either fail spuriously or pass against an implicit zero, so without v2 artifacts an enforced run fails with `unevaluated-arm` for each of them. Same-key regression ceilings (`coreRuntimeBudgets`, `coreRuntimeCoverageBudgets`) always run against the real base. Genuine v2 artifacts are produced by running the v2-era `core-benchmarks` runner on a pre-promotion checkout (for example `de8dbdf868`).

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
- Artifact file-count reporting
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
