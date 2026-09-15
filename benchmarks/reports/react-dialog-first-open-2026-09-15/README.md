# React dialog first-open delay

This report records the initial default-dialog fix. The
[follow-up loader audit](../consent-loader-audit-2026-09-15/README.md) expands
the fix to compound exports and other loaders, preserves SSR hydration, and
remeasures the default dialog with the final implementation.

The default aggregate `ConsentDialog` waits for React's Suspense retry throttle
after its code has loaded. A cached module subscription removes that wait while
keeping the dialog loaded on demand. No configuration changes are required.

## Results

Times are medians in milliseconds after clicking, from ten fresh browser contexts
per version. Each context opens the real banner's Customize button, closes with
Escape, then reopens through a button calling `useSetActiveUI`.

| Event | Before first open | After first open | Before reopen | After reopen |
| --- | ---: | ---: | ---: | ---: |
| JS/CSS downloads complete | 46 | 9 | No requests | No requests |
| Dialog mounted | 307 | 24 | 17 | 9 |
| First visible | 334 | 43 | 31 | 20 |
| Fully visible | 475 | 184 | 175 | 161 |

The median delay from the last JS/CSS download to DOM insertion fell from 261 ms
to 15 ms. This comparison helps separate the scheduling improvement from the
variation in local development-server download timings. First-open mount time
fell by 92%. Neither version requested a manifest or `/init` during opening.

The reported 568 ms first mount was not reproduced exactly. This fixture
reproduced a roughly 300 ms first-open delay. It does not establish the source
of the additional delay in the original application.

Raw samples: [before](./before.json), [after](./after.json).

## Cause and change

Before the fix, the aggregate component renders `React.lazy` inside
`Suspense fallback={null}` when `activeUI` becomes `dialog`. React throttles the
retry that reveals the loaded component even though the fallback is invisible.
Reopening reuses the resolved lazy component and avoids that retry.

Instrumenting `window.setTimeout` before hydration captured React scheduling
`bound completeRootWhenReady` at click +7.7 ms with a 297.5 ms delay. Its stack
passes through `performWorkOnRoot`. Further retries used the remaining portion
of the same deadline. React's renderer defines `FALLBACK_THROTTLE_MS = 300`.

The initial default-dialog fix used `useSyncExternalStore` to subscribe to a cached
dynamic import. Import completion mounts the component directly. Hover/focus
warming fills the same cache. Import errors propagate to error boundaries.
The default dialog and floating trigger already render through client-only
portals. Compound exports initially kept their existing Suspense behavior because they
can also render inline during SSR.

## Method

- Baseline: commit `73c384b78`, workspace `@c15t/react@3.0.0-alpha.1`, built
  locally. The published npm alpha.1 tarball was inspected and contains the
  same aggregate Suspense loader.
- Next.js 16.2.10 development server, Turbopack, macOS arm64.
- Next's bundled React: `19.3.0-canary-3f0b9e61-20260317`.
- Playwright 1.61.1, headless Chromium 149.0.7827.55, no CPU or network throttle.
- The compiler is warmed once. Each measured context has fresh cookies,
  storage, HTTP cache, and module state. The page uses hosted mode with the
  existing local benchmark `/init` fixture and default dialog animations.
- The script waits for hydration, an active banner, and a visible Customize
  button, then calls that real DOM button's `click()`. This invokes its React
  handler without pointer-enter or focus preloading. It is not a physical
  pointer-latency measurement.
- A MutationObserver records insertion of `consent-dialog-root`. Animation
  frames sample the product of its opacity and its ancestors' opacities.
  First visible means opacity above zero with nonzero height; fully visible
  means opacity at least 0.999. These are DOM/style measurements, not a
  compositor screenshot measurement.
- Resources beginning after the click are recorded through Resource Timing.
  The JSON summaries use the arithmetic median of the two middle samples.

## Reproduce

From the repository root, build and start the fixture:

```sh
bun turbo run build --filter=@c15t/react
bun run --cwd benchmarks/react-browser-bench dev --port 3217
```

In another terminal:

```sh
BENCH_OUTPUT=/tmp/dialog-first-open.json bun benchmarks/react-browser-bench/scripts/run-dialog-first-open-bench.ts
```

`BENCH_URL` overrides the page URL and `BENCH_ITERATIONS` overrides the ten
measured sessions. The fixture is `/dialog-first-open`.

## Validation

The regression test uses a real React root outside `act()`, since `act()` skips
the retry throttle. It checks that the dialog appears within two animation
frames of module completion, then verifies closing and reopening. It fails on
the original loader and passes with the fix.

All 33 targeted browser tests passed across the new regression, active UI
transitions, consent flow, and banner policy actions. Package builds, React
source and public type tests, benchmark TypeScript checks, and changed-file
lint/format checks passed. The full repository CI and production-mode
performance were not run.
