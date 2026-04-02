# @c15t/nextjs

## 2.0.0-rc.6

### Patch Changes

- 5c8ee05: feat(styles): ship explicit stylesheet entrypoints for prebuilt UI

  - Publish explicit `styles.css` and `iab/styles.css` entrypoints for prebuilt UI in `@c15t/ui`, `@c15t/react`, and `@c15t/nextjs`
  - Update docs and CLI setup so stylesheet imports and Tailwind host-app configuration are explicit
  - Support the documented Tailwind 3 and Tailwind 4 layering model without requiring `!important`
  - Add automated first-paint CDP benchmark (`benchmarks/vite-react-repro/scripts/run-first-paint-bench.ts`)

  **Bundle impact (vite-react-repro):**

  - JS: 435.5 KB → 361.0 KB (-74.5 KB raw, -13.4 KB gzip / -11%)
  - CSS: 0.8 KB → 49.2 KB (moved from JS to CSS — net gzip saving: -6.5 KB / -5%)
  - `createElement("style")` runtime calls: eliminated
  - JS heap: -143 KB (-8%)

  **Main-thread impact (6x CPU throttle, 3 runs × 60 samples):**

  - JS evaluation: 64.5 ms → 53.1 ms (-11.4 ms / -17.7%)
  - Total → first paint: 87.8 ms → 76.5 ms (-11.3 ms / -12.9%)

- Updated dependencies [e08e52c]
- Updated dependencies [5c8ee05]
- Updated dependencies [bb3ab0f]
- Updated dependencies [1a724fc]
  - c15t@2.0.0-rc.6
  - @c15t/react@2.0.0-rc.6

## 2.0.0-rc.5

### Patch Changes

- 021ac99: Bundle version-matched docs inside published c15t packages under `docs/**` for local agent and developer reference.

  Remove CLI `AGENTS.md` generation. Use the bundled package docs directly alongside c15t agent skills.

- 5f30a3b: Add browser prefetch utilities for faster consent banner visibility

  - New `buildPrefetchScript()` and `getPrefetchedInitialData()` in `c15t` core to start the `/init` request before framework hydration
  - New `C15tPrefetch` component in `@c15t/nextjs` using `next/script` with `beforeInteractive` strategy for static-route-compatible prefetching
  - Tuned default motion tokens (fast: 80ms, normal: 150ms, slow: 200ms) and replaced hardcoded CSS durations with theme variables

- e79f840: Separate published declaration files from runtime bundles to improve Vite compatibility

  - Move generated `.d.ts` files out of `dist/` into `dist-types/` across published packages
  - Stop emitting declaration maps in shared TypeScript config so `.d.ts.map` files are no longer published
  - Emit declarations only once per package to avoid unstable output when both `esm` and `cjs` builds write types
  - Update package `types` metadata, publish file lists, Turbo outputs, and publish artifact checks for the new layout
  - Verify the package layout works in Vite 7 without `optimizeDeps.exclude` workarounds for `c15t` and `@c15t/react`

- 45f1a34: fix(nextjs): cache initial data requests
- Updated dependencies [021ac99]
- Updated dependencies [5f30a3b]
- Updated dependencies [58fb392]
- Updated dependencies [e79f840]
- Updated dependencies [58fb392]
- Updated dependencies [60a51f1]
- Updated dependencies [372cf92]
  - c15t@2.0.0-rc.5
  - @c15t/react@2.0.0-rc.5
  - @c15t/translations@2.0.0-rc.5

## Unreleased

- Bundle version-matched docs in the published package under `docs/**` for local developer and agent reference.

## 2.0.0-rc.4

### Patch Changes

- Updated dependencies [06ee724]
- Updated dependencies [0a42b31]
- Updated dependencies [29819bc]
  - @c15t/translations@2.0.0-rc.4
  - @c15t/react@2.0.0-rc.4
  - c15t@2.0.0-rc.4

## 2.0.0-rc.3

### Patch Changes

- Updated dependencies [de6dd82]
- Updated dependencies [1c813bc]
- Updated dependencies [0f10f3e]
  - @c15t/react@2.0.0-rc.3
  - c15t@2.0.0-rc.3

## 2.0.0-rc.2

### Patch Changes

- Updated dependencies [408df0e]
- Updated dependencies [e6bc5db]
- Updated dependencies [684bf2a]
  - @c15t/react@2.0.0-rc.2
  - c15t@2.0.0-rc.2

## 2.0.0-rc.1

### Patch Changes

- 0bc4f86: fixed workspace resolving
- Updated dependencies [0bc4f86]
  - @c15t/translations@2.0.0-rc.1
  - @c15t/react@2.0.0-rc.1
  - c15t@2.0.0-rc.1

## 2.0.0-rc.0

### Major Changes

- 126a78b: https://v2.c15t.com/changelog/2026-02-12-v2.0.0-rc.0

### Patch Changes

- Updated dependencies [126a78b]
  - c15t@2.0.0-rc.0
  - @c15t/react@2.0.0-rc.0
  - @c15t/translations@2.0.0-rc.0

## 1.8.3

### Patch Changes

- Updated dependencies [6c28663]
  - @c15t/react@1.8.3

## 1.8.3-canary-20260109181827

### Patch Changes

- @c15t/react@1.8.3-canary-20260109181827

## 1.8.3-canary-20251222100111

### Patch Changes

- @c15t/react@1.8.3-canary-20251222100111

## 1.8.3-canary-20251218133143

### Patch Changes

- Updated dependencies [226f45c]
  - @c15t/react@1.8.3-canary-20251218133143

## 1.8.2

### Patch Changes

- Updated dependencies [2ce4d5a]
  - @c15t/react@1.8.2

## 1.8.2-canary-20251212163241

### Patch Changes

- @c15t/react@1.8.2-canary-20251212163241

## 1.8.2-canary-20251212112113

### Patch Changes

- Updated dependencies [7284b23]
- Updated dependencies [dfd5e4f]
  - @c15t/react@1.8.2-canary-20251212112113

## 1.8.2-canary-20251210222051

### Patch Changes

- Updated dependencies [a03d607]
  - @c15t/react@1.8.2-canary-20251210222051

## 1.8.2-canary-20251210105424

### Patch Changes

- Updated dependencies [3eb3f4a]
  - @c15t/react@1.8.2-canary-20251210105424

## 1.8.1

### Patch Changes

- @c15t/react@1.8.1

## 1.8.0

### Minor Changes

- 68a7324: Full Changelog: https://c15t.com/changelog/2025-10-27-v1.8.0

### Patch Changes

- Updated dependencies [68a7324]
  - @c15t/react@1.8.0
  - @c15t/translations@1.8.0

## 1.8.0-canary-20251112105612

### Minor Changes

- 69d6680: feat: country, region & language overrides

### Patch Changes

- 31953f4: refactor: improve package exports ensuring React has same exports as core
- 6e3034c: refactor: update rslib to latest version
- Updated dependencies [31953f4]
- Updated dependencies [221a553]
- Updated dependencies [7043a2e]
- Updated dependencies [6e3034c]
- Updated dependencies [bee7789]
- Updated dependencies [69d6680]
  - @c15t/react@1.8.0-canary-20251112105612
  - @c15t/translations@1.8.0-canary-20251112105612

## 1.8.0-canary-20251028143243

### Patch Changes

- 37561e1: fix(nextjs): missing certain headers on non-rewrite requests
- ccf32a2: fix(nextjs): client side options re-render
- 2ad1ff3: fix(nextjs): missing InitialDataPromise type export for pages
- Updated dependencies [067c7af]
- Updated dependencies [a0fab48]
  - @c15t/react@1.8.0-canary-20251028143243

## 1.7.0

### Patch Changes

- aa16d03: You can find the full changelog at https://c15t.com/changelog/2025-10-11-v1.7.0
- Updated dependencies [aa16d03]
  - @c15t/react@1.7.0
  - @c15t/translations@1.7.0

## 1.7.0-canary-20251014174050

### Patch Changes

- Updated dependencies [87ce89f]
  - @c15t/react@1.7.0-canary-20251014174050

## 1.7.0-canary-20251012181938

### Minor Changes

- 0c80bed: feat: added script loader, deprecated tracking blocker
- a58909c: feat(react): added frame component for conditionally rendering content with a placeholder e.g. iframes
  feat(core): added headless iframe blocking with the data-src & data-category attributes
  fix(react): improved button hover transitions when changing theme

### Patch Changes

- 3b787d7: refactor(nextjs): headless export
- Updated dependencies [0c80bed]
- Updated dependencies [a58909c]
  - @c15t/translations@1.7.0-canary-20251012181938
  - @c15t/react@1.7.0-canary-20251012181938

## 1.6.1

### Patch Changes

- Updated dependencies [6257a20]
  - @c15t/react@1.6.1

## 1.6.0

### Minor Changes

- 84ab0c7: For a full detailed changelog see the [v1.6.0 release notes](https://c15t.com/changelog/2025-09-08-v1.6.0).

### Patch Changes

- Updated dependencies [84ab0c7]
  - @c15t/react@1.6.0
  - @c15t/translations@1.6.0
