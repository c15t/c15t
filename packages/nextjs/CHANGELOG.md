# @c15t/nextjs

## 2.0.0

### Major Changes

- 32617c9: Changelog available at https://c15t.com/changelog/2026-04-14-v2.0.0

### Patch Changes

- Updated dependencies [32617c9]
- Updated dependencies [32617c9]
- Updated dependencies [32617c9]
  - c15t@2.0.0
  - @c15t/react@2.0.0
  - @c15t/translations@2.0.0

## 2.0.0-rc.12

### Patch Changes

- aa2bb42: Fix consent switch sizing so it renders consistently in Tailwind and non-Tailwind apps.

  - `@c15t/ui`: make the shared switch primitive use an explicit `border-box` layout, size its track independently of host box-model resets, and clip the track so the thumb ring does not bleed past the edge.
  - `@c15t/react`: publish the updated prebuilt consent UI styling so React consumers pick up the normalized switch sizing.
  - `@c15t/nextjs`: publish the updated stylesheet bridge so Next.js installs pick up the normalized switch sizing as well.

- Updated dependencies [aa2bb42]
  - @c15t/react@2.0.0-rc.12

## 2.0.0-rc.10

### Patch Changes

- Updated dependencies [64d6009]
- Updated dependencies [79ae8cf]
- Updated dependencies [9579b62]
  - @c15t/react@2.0.0-rc.10
  - c15t@2.0.0-rc.10

## 2.0.0-rc.9

### Patch Changes

- 59b850b: Harden the prebuilt consent-surface branding against host-page CSS so the INTH and c15t wordmarks stay correctly sized across docs, marketing sites, and other embedded app shells.

  - `@c15t/react`: wrap both prebuilt full-logo branding paths in shared internal wordmark containers instead of attaching sizing classes directly to the raw `svg` elements.
  - `@c15t/ui`: move the logo constraints onto the internal branding wrappers and nested `svg` elements, adding explicit flex, max-width, block-layout, and aspect-ratio rules so global host-page `svg` styles cannot blow up or collapse either wordmark.
  - `@c15t/nextjs`: keep the published styled surface behavior aligned with the hardened React/UI branding path used by the prebuilt consent banner and dialog components.

- Updated dependencies [59b850b]
  - @c15t/react@2.0.0-rc.9

## 2.0.0-rc.8

### Patch Changes

- 5956531: Simplify the 2.0 static prefetch flow so static routes only need to start `/init` early and matching prefetched data is consumed automatically during first store initialization.

  - `c15t`: add canonical request-context metadata for SSR and browser-prefetch payloads, auto-consume matching prefetched data on first runtime/store initialization, and replace blanket SSR skip-on-overrides behavior with exact request-context matching.
  - `@c15t/react`: preserve the dynamic SSR `fetchInitialData()` flow while exposing the new `context_mismatch` SSR status behavior for matching overrides, backend URLs, credentials, and ambient GPC.
  - `@c15t/nextjs`: remove the RC-era public static-prefetch consumer APIs from the package surface and document `C15tPrefetch` as the only static-route setup step.
  - `@c15t/cli`: update generated static-route templates to rely on automatic prefetch consumption instead of wiring manual prefetch lookups.

- cd9c830: Fix the `PolicyActions` DX regressions and the published stylesheet packaging for the prebuilt consent UI.

  - `@c15t/ui`: deduplicate policy-action helper ownership behind `c15t`, normalize widget footer subgroup naming, and add direct coverage for action-group flattening.
  - `@c15t/react`: share the internal `PolicyActions` renderer across banner and widget, add `consentAction` to policy-action render props so stock overrides preserve built-in theming, restore the banner default footer layout when policy hints do not provide a layout, and extend regression coverage.
  - `@c15t/nextjs`: keep the published stylesheet bridge files aligned with the package entrypoints and publish-artifact guard.

- 05db767: Align the styled package install path around app-level CSS entrypoints instead of JS-side stylesheet imports.

  - `@c15t/react`: update the published README guidance, quickstart docs, and stylesheet usage comments so styled and IAB installs consistently import `@c15t/react/styles.css` or `styles.tw3.css` from a global CSS file, with explicit guidance on why this avoids layer-order debugging problems.
  - `@c15t/nextjs`: update the published README guidance, quickstart docs, and stylesheet usage comments so styled and IAB installs consistently import `@c15t/nextjs/styles.css` or `styles.tw3.css` from `app/globals.css`, with explicit guidance on why this avoids layer-order debugging problems.
  - `@c15t/cli`: move the stylesheet codemod and scaffold behavior to mutate global CSS entrypoints, remove old JS-side stylesheet imports, share the CSS-entrypoint mutation logic between generate and codemod flows, and add regression coverage for Tailwind v3/v4, IAB, dry-run, and missing-CSS cases.

- fee82fd: Refine prebuilt consent-surface branding so it feels attached to the UI instead of appended.

  - `@c15t/react`: add attached branding tags to the stock consent banner, consent dialog, IAB banner, and IAB dialog; localize the branding copy through translations; and add a `hideBranding` prop to the stock `ConsentBanner` component.
  - `@c15t/nextjs`: keep the published stylesheet entrypoints aligned with the updated prebuilt branding treatment while simplifying stylesheet distribution to reference upstream package styles directly.
  - `@c15t/ui`: update the shared consent branding tag styles for tighter edge attachment, smaller visual footprint, and consistent banner/dialog treatment across standard and IAB surfaces.
  - `@c15t/translations`: add the shared localized branding copy used by the updated prebuilt consent surfaces.

- Updated dependencies [43f1b68]
- Updated dependencies [3d4c107]
- Updated dependencies [c944e35]
- Updated dependencies [5956531]
- Updated dependencies [918a70e]
- Updated dependencies [cd9c830]
- Updated dependencies [05db767]
- Updated dependencies [fee82fd]
  - c15t@2.0.0-rc.8
  - @c15t/react@2.0.0-rc.8
  - @c15t/translations@2.0.0-rc.8

## 2.0.0-rc.7

### Patch Changes

- Updated dependencies [ec30bd1]
  - @c15t/react@2.0.0-rc.7

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

- 126a78b: https://c15t.com/changelog/2026-02-12-v2.0.0-rc.0

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
