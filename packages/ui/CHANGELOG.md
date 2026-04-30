# @c15t/ui

## 2.0.1

### Patch Changes

- 50e17f0: Fix Tailwind CSS v3 stylesheet packaging so package resolvers that do not follow nested CSS imports still include the generated c15t component rules.

  Root `styles.tw3.css` and `iab/styles.tw3.css` proxy entrypoints are now published, and the React/Next.js Tailwind v3 dist stylesheets inline the generated UI CSS instead of forwarding through nested package imports.

## 2.0.0

### Major Changes

- 32617c9: Changelog available at https://c15t.com/changelog/2026-04-14-v2.0.0

### Patch Changes

- Updated dependencies [32617c9]
- Updated dependencies [32617c9]
  - c15t@2.0.0
  - @c15t/translations@2.0.0

## 2.0.0-rc.11

### Patch Changes

- aa2bb42: Fix consent switch sizing so it renders consistently in Tailwind and non-Tailwind apps.

  - `@c15t/ui`: make the shared switch primitive use an explicit `border-box` layout, size its track independently of host box-model resets, and clip the track so the thumb ring does not bleed past the edge.
  - `@c15t/react`: publish the updated prebuilt consent UI styling so React consumers pick up the normalized switch sizing.
  - `@c15t/nextjs`: publish the updated stylesheet bridge so Next.js installs pick up the normalized switch sizing as well.

## 2.0.0-rc.10

### Minor Changes

- 79ae8cf: Remove the legacy stock-branding theme keys and require the new explicit tag slots for prebuilt consent surfaces.

  - `@c15t/react`: stop resolving stock banner/dialog/widget/IAB branding tags through legacy footer-branding aliases and render the standalone widget/dialog tags without the old footer-wrapper compatibility path.
  - `@c15t/ui`: add explicit branding tag slots for each prebuilt surface: `consentBannerTag`, `consentDialogTag`, `consentWidgetTag`, `iabConsentBannerTag`, and `iabConsentDialogTag`.

  Breaking change:

  - `consentWidgetBranding` has been removed. Use `consentWidgetTag`.
  - `consentDialogFooter` no longer styles the stock dialog branding tag. Use `consentDialogTag`.
  - Style stock banner and IAB branding tags via the new explicit tag slots instead of footer-related keys.

### Patch Changes

- 64d6009: Replace the shared `clsx` dependency with a local `cn` implementation owned by `@c15t/ui`.

  - `@c15t/ui`: own the public `ClassValue` type and `cn(...)` implementation directly instead of re-exporting them from `clsx`, with coverage for nested arrays, object maps, numeric values, and ordering.
  - `@c15t/react`: continue consuming the shared `@c15t/ui` class helper while dropping the now-unused direct `clsx` dependency from the published package.
  - `@c15t/dev-tools`: remove the unused direct `clsx` dependency from the published package manifest.

- 7576dc1: Derive `textOnPrimary` automatically from the active `primary` theme color when it is omitted, so primary-filled surfaces such as stock branding tags keep a readable foreground by default.

  - add a shared contrast helper in the UI theme utilities and use it as the fallback for `textOnPrimary`
  - preserve explicit `textOnPrimary` overrides for consumers who need a fixed branded foreground

- Updated dependencies [9579b62]
  - c15t@2.0.0-rc.10

## 2.0.0-rc.9

### Patch Changes

- 59b850b: Harden the prebuilt consent-surface branding against host-page CSS so the INTH and c15t wordmarks stay correctly sized across docs, marketing sites, and other embedded app shells.

  - `@c15t/react`: wrap both prebuilt full-logo branding paths in shared internal wordmark containers instead of attaching sizing classes directly to the raw `svg` elements.
  - `@c15t/ui`: move the logo constraints onto the internal branding wrappers and nested `svg` elements, adding explicit flex, max-width, block-layout, and aspect-ratio rules so global host-page `svg` styles cannot blow up or collapse either wordmark.
  - `@c15t/nextjs`: keep the published styled surface behavior aligned with the hardened React/UI branding path used by the prebuilt consent banner and dialog components.

## 2.0.0-rc.8

### Patch Changes

- cd9c830: Fix the `PolicyActions` DX regressions and the published stylesheet packaging for the prebuilt consent UI.

  - `@c15t/ui`: deduplicate policy-action helper ownership behind `c15t`, normalize widget footer subgroup naming, and add direct coverage for action-group flattening.
  - `@c15t/react`: share the internal `PolicyActions` renderer across banner and widget, add `consentAction` to policy-action render props so stock overrides preserve built-in theming, restore the banner default footer layout when policy hints do not provide a layout, and extend regression coverage.
  - `@c15t/nextjs`: keep the published stylesheet bridge files aligned with the package entrypoints and publish-artifact guard.

- fee82fd: Refine prebuilt consent-surface branding so it feels attached to the UI instead of appended.

  - `@c15t/react`: add attached branding tags to the stock consent banner, consent dialog, IAB banner, and IAB dialog; localize the branding copy through translations; and add a `hideBranding` prop to the stock `ConsentBanner` component.
  - `@c15t/nextjs`: keep the published stylesheet entrypoints aligned with the updated prebuilt branding treatment while simplifying stylesheet distribution to reference upstream package styles directly.
  - `@c15t/ui`: update the shared consent branding tag styles for tighter edge attachment, smaller visual footprint, and consistent banner/dialog treatment across standard and IAB surfaces.
  - `@c15t/translations`: add the shared localized branding copy used by the updated prebuilt consent surfaces.

- Updated dependencies [43f1b68]
- Updated dependencies [3d4c107]
- Updated dependencies [c944e35]
- Updated dependencies [5956531]
- Updated dependencies [fee82fd]
  - c15t@2.0.0-rc.8
  - @c15t/translations@2.0.0-rc.8

## 2.0.0-rc.7

### Minor Changes

- ec30bd1: feat(primitives): shared UI primitive runtime, framework adapters, and runtime performance

  - Extract seven framework-agnostic primitives into `@c15t/ui/primitives`: accordion, button, collapsible, dialog, switch, tabs, and preference-item
  - Add `PreferenceItem` compound component that unifies three separate expandable-row patterns (Radix Accordion, custom button + AnimatedCollapse, manual state) into a single composable primitive with semantic slots
  - Publish framework adapter packages (`@c15t/solid`, `@c15t/vue`, `@c15t/svelte`) re-exporting shared primitives and CSS variant generators
  - Add cross-framework storybooks with shared play-function interaction tests and CI test-runner integration

  **Mobile viewport fixes:**

  - Add `box-sizing: border-box` to all fixed-position consent roots (banner, dialog, IAB variants) — prevents horizontal overflow on narrow viewports
  - Constrain dialog card with `max-height: 100%` and scrollable content area — prevents title/description from being pushed off-screen on small devices

  **Runtime performance (react-browser-bench, full-ui scenario):**

  - Memoize `useTheme()` deep merge with `useMemo` — reduces calls from 35 to 23 (-35%), total time from 0.10 ms to 0.02 ms (-80%)
  - Replace `offsetWidth`/`offsetHeight` visibility checks in focus trap with `checkVisibility()` API — eliminates forced synchronous layout on every Tab keypress
  - Both optimizations are in `@c15t/ui` and benefit all frameworks equally

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
- Updated dependencies [bb3ab0f]
- Updated dependencies [1a724fc]
  - c15t@2.0.0-rc.6

## 2.0.0-rc.5

### Patch Changes

- 5f30a3b: Add browser prefetch utilities for faster consent banner visibility

  - New `buildPrefetchScript()` and `getPrefetchedInitialData()` in `c15t` core to start the `/init` request before framework hydration
  - New `C15tPrefetch` component in `@c15t/nextjs` using `next/script` with `beforeInteractive` strategy for static-route-compatible prefetching
  - Tuned default motion tokens (fast: 80ms, normal: 150ms, slow: 200ms) and replaced hardcoded CSS durations with theme variables

- 58fb392: Rename translation-facing APIs from `translations` to `i18n` across runtime types and helpers.
  Add CLI migration codemods to update existing projects to the new naming.
- e79f840: Separate published declaration files from runtime bundles to improve Vite compatibility

  - Move generated `.d.ts` files out of `dist/` into `dist-types/` across published packages
  - Stop emitting declaration maps in shared TypeScript config so `.d.ts.map` files are no longer published
  - Emit declarations only once per package to avoid unstable output when both `esm` and `cjs` builds write types
  - Update package `types` metadata, publish file lists, Turbo outputs, and publish artifact checks for the new layout
  - Verify the package layout works in Vite 7 without `optimizeDeps.exclude` workarounds for `c15t` and `@c15t/react`

- Updated dependencies [021ac99]
- Updated dependencies [5f30a3b]
- Updated dependencies [58fb392]
- Updated dependencies [e79f840]
- Updated dependencies [58fb392]
- Updated dependencies [60a51f1]
- Updated dependencies [372cf92]
  - c15t@2.0.0-rc.5
  - @c15t/translations@2.0.0-rc.5

## 2.0.0-rc.4

### Patch Changes

- Updated dependencies [06ee724]
- Updated dependencies [29819bc]
  - @c15t/translations@2.0.0-rc.4
  - c15t@2.0.0-rc.4

## 2.0.0-rc.3

### Patch Changes

- de6dd82: fix(ui): dark mode not being applied
- Updated dependencies [1c813bc]
- Updated dependencies [0f10f3e]
  - c15t@2.0.0-rc.3

## 2.0.0-rc.2

### Patch Changes

- 408df0e: feat: CMP ID now comes from backend, either consent.io when hosted or BYO CMP ID
  feat: Center the IAB Banner for better policy compliance
  feat: Improve doc comments around IAB
- e6bc5db: fix: update import paths from .css to .js for component styles
- 684bf2a: fix(ui): dialog width customization, disableAnimation preventing dialog from showing
- Updated dependencies [408df0e]
  - c15t@2.0.0-rc.2

## 2.0.0-rc.1

### Patch Changes

- 0bc4f86: fixed workspace resolving
- Updated dependencies [0bc4f86]
  - @c15t/translations@2.0.0-rc.1
  - c15t@2.0.0-rc.1

## 2.0.0-rc.0

### Major Changes

- 126a78b: https://c15t.com/changelog/2026-02-12-v2.0.0-rc.0

### Patch Changes

- Updated dependencies [126a78b]
  - c15t@2.0.0-rc.0
  - @c15t/translations@2.0.0-rc.0
