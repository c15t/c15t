# Consent loader audit

The first-open scheduling delay also affects React's aggregate compound exports,
the preference widget, and Astro's React IAB dialog island. The external-runtime
provider has a related state-loss bug: its fallback children mount immediately,
then remount when the lazy IAB context bridge resolves.

Vue/Nuxt did not reproduce the React retry delay. A separate hover/focus
preloading change was measured and then removed because it did not demonstrate
a cold-open improvement. This PR leaves Vue/Nuxt behavior unchanged.

## Results

Five fresh Chromium contexts per case, with no hover or focus before clicking
the real banner's Customize button. Times are median milliseconds after the
click. The compiler warmup is discarded.

| Case | Before mount | Fixed mount | Before content ready | Fixed content ready | Before last download to content | Fixed last download to content |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| React compound dialog | 305 | 14 | 305 | 18 | 296 | 10 |
| React widget | 307 | 21 | 307 | 21 | 212 | 13 |
| Astro React IAB island | 364 | 91 | 364 | 91 | 352 | 77 |

### Removed Vue/Nuxt experiment

The proposed hover/focus preloading change measured 26 → 45 ms for a cold
Nuxt dialog, with last-download completion moving from 20 ms to 36 ms and the
remaining time to content from 6 ms to 9 ms. Five development samples do not
establish whether the difference is variability or a regression. They show
neither a cold-open improvement nor a 300 ms scheduling stall.

After a 200 ms hover, the experimental version mounted in 7 ms with no requests
during the click in all five samples. That separate warm condition does not
address an immediate click. The preloading change, its test and user docs were
removed from the PR. The baseline is in [before/nuxt.json](./before/nuxt.json);
experimental results are in [removed-vue-preloading](./removed-vue-preloading/).
Those experimental results describe commit `06292be86`, not the final code.
Idle prefetch was disabled in both Nuxt conditions.

### External runtime and default dialog

The external-runtime child initially mounts in 5 ms before and 4 ms after.
Before the fix, all five samples record another mount about 302 ms later.
After the fix, none does. StrictMode's immediate duplicate effects remain;
they are distinct from that delayed remount. A regression test edits a draft
input and verifies that both its DOM node and value survive module completion.

The default dialog was measured again with the final shared loader, using ten
fresh sessions and the original benchmark. Median mount / first visible /
fully visible times are 29 / 46 / 188 ms on first open and 11 / 27 / 168 ms on
reopen. The original baseline was 307 / 334 / 475 ms. See the
[initial report](../react-dialog-first-open-2026-09-15/README.md) for its raw
baseline and the original scheduling trace.

React/Astro raw samples are in [before](./before/) and [after](./after/). Each
row's download gap is the median of per-sample differences, not a difference
of medians.

## Changes

- React aggregate exports share a cached module subscription. `useSyncExternalStore`
  triggers a synchronous retry once the lazy export resolves. The lazy element
  and Suspense boundary stay stable through server rendering and hydration, so
  the fix preserves existing server DOM instead of replacing it. Hover/focus
  preloading uses the same module cache.
- The external-runtime provider imports its small IAB context bridge eagerly.
  The bridge imports IAB types and context, not the TCF runtime. Removing the
  fallback tree prevents children from mounting twice and losing draft state.
- Astro's client-only React IAB island resolves its dynamic import through
  component state. It still loads IAB UI on demand and reuses it on reopen.

The source audit also covered Svelte, the private Solid wrapper, and consent
script, iframe and network-blocker loaders. They do not use this React Suspense
retry pattern. They were not separately performance-benchmarked here. React
integrations such as Next.js and TanStack Start inherit the aggregate-loader
fix; TanStack Start was not separately benchmarked.

## Method and limits

- Baseline for the additional cases: `f2669e67c`, which already contains the
  initial default-dialog fix. Packages identify as `3.0.0-alpha.1`.
- macOS arm64, headless Chromium 149.0.7827.55, Playwright 1.61.1, no CPU or
  network throttling. Next.js 16.2.10 development renderer uses its bundled
  React `19.3.0-canary-3f0b9e61-20260317`. Nuxt 4.5.1 uses Vue 3.5.40.
- Every sample gets fresh storage, HTTP cache and module state. The Next fixture
  waits for hydration and the active banner. The Nuxt `/client` fixture renders
  its banner in the browser. DOM `click()` invokes the real handler without
  pointer-enter or focus preloading; this does not measure physical input latency.
- The compound fixture mounts its exports conditionally, so all are cold when
  opened. A MutationObserver measures DOM insertion and the title becoming
  available. Other cases use their root content. These are mount/content
  measurements, not screenshots or full-animation timings.
- The Astro case imports the actual Astro React island source into the Next
  benchmark, with a started local IAB runtime and fixture GVL. It isolates the
  island's React loader. It does not measure full Astro navigation, island
  bootstrap, or vendor-list downloads.
- Resource Timing records requests starting after clicking and completed by
  content readiness. The external probe separately records mount effects for
  700 ms, because its fallback already contains content.
- These local development measurements do not establish production latency or
  eliminate network and parse costs. The reported 568 ms mount in the user's
  original app was not reproduced exactly.

## Reproduce

Build the packages and start each fixture in its own terminal:

```sh
bun turbo run build --filter=@c15t/react --filter=@c15t/astro --filter=@c15t/vue
bun run --cwd benchmarks/react-browser-bench dev --port 3217
bun run --cwd benchmarks/nuxt-browser-bench dev --port 4313
```

Run cases sequentially:

```sh
VARIANT=compound bun benchmarks/react-browser-bench/scripts/run-loader-audit.ts
VARIANT=widget bun benchmarks/react-browser-bench/scripts/run-loader-audit.ts
VARIANT=external bun benchmarks/react-browser-bench/scripts/run-loader-audit.ts
VARIANT=astro-iab bun benchmarks/react-browser-bench/scripts/run-loader-audit.ts
VARIANT=nuxt bun benchmarks/react-browser-bench/scripts/run-loader-audit.ts
VARIANT=nuxt WARM=1 bun benchmarks/react-browser-bench/scripts/run-loader-audit.ts
bun benchmarks/react-browser-bench/scripts/run-dialog-first-open-bench.ts
```

`BENCH_URL`, `BENCH_ITERATIONS` and `BENCH_OUTPUT` override the defaults.
The additional-case runner defaults to five measured sessions, the original
dialog runner to ten. To reproduce the additional baselines, use the same
fixture and runner with package implementations from `f2669e67c`. The removed
Nuxt experiment requires Vue implementations from `06292be86`.

## Validation

43 targeted React/browser tests and six Astro adapter tests pass. After removing
the Vue experiment, all 11 existing banner tests pass, and the Vue source and
quickstart docs match the baseline exactly.
Coverage floors are disabled for these subsets because they apply to the full
packages. The Astro loader and external-child regression tests both fail with
the previous implementations. Tests also cover cold loading, shared preloading,
unmounting during a load, import failure, closing/reopening, consent actions,
and server markup identity through hydration.

React and Astro builds, React source/public types, Astro types,
benchmark TypeScript, and changed-file lint/format checks pass. Full repository
CI was not verified locally. The earlier Local CI attempt stopped when the
unrelated workflow-security job reported zizmor's "no inputs collected" error.
