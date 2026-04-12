# @c15t/react

## 2.0.0-rc.8

### Minor Changes

- 3d4c107: feat(consent): add change-only consent callbacks

  - add `onConsentChanged` as a dedicated callback for explicit consent saves that change an existing persisted consent state
  - include both previous and current consent categories in the callback payload so analytics and integrations can diff grant/revoke transitions directly
  - keep `onConsentSet` focused on broad consent-state updates, including initialization and auto-grant flows
  - update the React provider to keep callback registrations in sync when callback props change after mount

### Patch Changes

- 5956531: Simplify the 2.0 static prefetch flow so static routes only need to start `/init` early and matching prefetched data is consumed automatically during first store initialization.

  - `c15t`: add canonical request-context metadata for SSR and browser-prefetch payloads, auto-consume matching prefetched data on first runtime/store initialization, and replace blanket SSR skip-on-overrides behavior with exact request-context matching.
  - `@c15t/react`: preserve the dynamic SSR `fetchInitialData()` flow while exposing the new `context_mismatch` SSR status behavior for matching overrides, backend URLs, credentials, and ambient GPC.
  - `@c15t/nextjs`: remove the RC-era public static-prefetch consumer APIs from the package surface and document `C15tPrefetch` as the only static-route setup step.
  - `@c15t/cli`: update generated static-route templates to rely on automatic prefetch consumption instead of wiring manual prefetch lookups.

- 918a70e: Fix published TypeScript declaration packaging so consumers stay compatible across both TypeScript 5 and TypeScript 6.

  - `@c15t/react`: correct the `./primitives` type export entries so they point at the published `dist-types` files instead of missing declaration paths.
  - `@c15t/backend`, `@c15t/cli`, `@c15t/dev-tools`, `@c15t/logger`, `@c15t/node-sdk`, and `@c15t/scripts`: normalize emitted `dist-types` imports during builds so published declarations no longer reference sibling `.d.ts` files directly, which could break consumers on newer TypeScript versions.
  - Tooling: make declaration normalization discover package targets dynamically so the compatibility fix applies consistently across published packages instead of only a hardcoded subset.

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
- Updated dependencies [cd9c830]
- Updated dependencies [fee82fd]
  - c15t@2.0.0-rc.8
  - @c15t/ui@2.0.0-rc.8

## 2.0.0-rc.7

### Patch Changes

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

- Updated dependencies [ec30bd1]
  - @c15t/ui@2.0.0-rc.7

## 2.0.0-rc.6

### Minor Changes

- e08e52c: feat: Extract IAB TCF to `@c15t/iab` addon package

  IAB TCF 2.3 support is now an opt-in addon. Non-IAB users no longer pay for IAB code in their bundle.

  **Breaking changes:**

  - `IABConsentBanner`, `IABConsentDialog`, and `useHeadlessIABConsentUI` are no longer exported from `@c15t/react`. Import from `@c15t/react/iab` instead.
  - IAB config now requires the `iab()` wrapper from `@c15t/iab` instead of a plain `{ enabled: true, ... }` object.

  **Migration:**

  ```tsx
  // Before
  import { IABConsentBanner, IABConsentDialog } from '@c15t/react';
  <ConsentManagerProvider options={{ iab: { enabled: true, cmpId: 28 } }}>

  // After
  import { iab } from '@c15t/iab';
  import { IABConsentBanner, IABConsentDialog } from '@c15t/react/iab';
  <ConsentManagerProvider options={{ iab: iab({ cmpId: 28 }) }}>
  ```

  **Bundle impact for non-IAB users:**

  - Core bundle: -3.0 KB gzip (-9.2%)
  - Lazy chunks eliminated: -9.9 KB gzip
  - Total: -12.9 KB gzip (-30%)
  - `@iabtechlabtcf/core` removed from core dependencies

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

- 1a724fc: fix(policy-packs): support multiple primary actions while keeping customize as the default primary action

  Expose `primaryActions` consistently across schema, backend, core, React, and dev-tools. Built-in preset and offline default policies keep `customize` as the default primary action, while custom policies can now mark multiple actions as primary.

- Updated dependencies [e08e52c]
- Updated dependencies [5c8ee05]
- Updated dependencies [bb3ab0f]
- Updated dependencies [1a724fc]
  - c15t@2.0.0-rc.6
  - @c15t/ui@2.0.0-rc.6

## 2.0.0-rc.5

### Patch Changes

- 021ac99: Bundle version-matched docs inside published c15t packages under `docs/**` for local agent and developer reference.

  Remove CLI `AGENTS.md` generation. Use the bundled package docs directly alongside c15t agent skills.

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
  - @c15t/ui@2.0.0-rc.5

## Unreleased

- Bundle version-matched docs in the published package under `docs/**` for local developer and agent reference.

## 2.0.0-rc.4

### Patch Changes

- 0a42b31: feat(react): ConsentDialogLink component
- Updated dependencies [29819bc]
  - c15t@2.0.0-rc.4
  - @c15t/ui@2.0.0-rc.4

## 2.0.0-rc.3

### Patch Changes

- de6dd82: fix(ui): dark mode not being applied
- 0f10f3e: fix(react): react compiler compatability
- Updated dependencies [de6dd82]
- Updated dependencies [1c813bc]
- Updated dependencies [0f10f3e]
  - @c15t/ui@2.0.0-rc.3
  - c15t@2.0.0-rc.3

## 2.0.0-rc.2

### Patch Changes

- 408df0e: feat: CMP ID now comes from backend, either consent.io when hosted or BYO CMP ID
  feat: Center the IAB Banner for better policy compliance
  feat: Improve doc comments around IAB
- e6bc5db: fix: update import paths from .css to .js for component styles
- 684bf2a: fix(ui): dialog width customization, disableAnimation preventing dialog from showing
- Updated dependencies [408df0e]
- Updated dependencies [e6bc5db]
- Updated dependencies [684bf2a]
  - c15t@2.0.0-rc.2
  - @c15t/ui@2.0.0-rc.2

## 2.0.0-rc.1

### Patch Changes

- 0bc4f86: fixed workspace resolving
- Updated dependencies [0bc4f86]
  - c15t@2.0.0-rc.1
  - @c15t/ui@2.0.0-rc.1

## 2.0.0-rc.0

### Major Changes

- 126a78b: https://v2.c15t.com/changelog/2026-02-12-v2.0.0-rc.0

### Patch Changes

- Updated dependencies [126a78b]
  - c15t@2.0.0-rc.0
  - @c15t/ui@2.0.0-rc.0

## 1.8.3

### Patch Changes

- 6c28663: Full Changelog: https://c15t.com/changelog/2026-01-19-v1.8.3
- Updated dependencies [6c28663]
  - c15t@1.8.3

## 1.8.3-canary-20260109181827

### Patch Changes

- Updated dependencies [486c46f]
  - c15t@1.8.3-canary-20260109181827

## 1.8.3-canary-20251222100111

### Patch Changes

- Updated dependencies [3d8eb68]
  - c15t@1.8.3-canary-20251222100111

## 1.8.3-canary-20251218133143

### Patch Changes

- 226f45c: fix(react): custom styling support for dialog and accordion
- Updated dependencies [9eff7a7]
- Updated dependencies [b7fafe6]
  - c15t@1.8.3-canary-20251218133143

## 1.8.2

### Patch Changes

- 2ce4d5a: \* feat(core): Added ability to disable c15t with the `enabled` prop. c15t will grant all consents by default when disabled as well as loading all scripts by default. Useful for when you want to disable consent handling but still allow the integration code to be in place.

  - fix(react): Frame component CSS overriding
  - fix(react): Legal links using the asChild slot causing multi-child error

  https://c15t.com/changelog/2025-12-12-v1.8.2

- Updated dependencies [2ce4d5a]
  - c15t@1.8.2

## 1.8.2-canary-20251212163241

### Patch Changes

- Updated dependencies [a368512]
  - c15t@1.8.2-canary-20251212163241

## 1.8.2-canary-20251212112113

### Patch Changes

- 7284b23: feat(core): add ability to disable c15t
- dfd5e4f: fix(react): frame css overiding
- Updated dependencies [7284b23]
  - c15t@1.8.2-canary-20251212112113

## 1.8.2-canary-20251210222051

### Patch Changes

- a03d607: fix(react): legal links using the asChild slot causing multi-child error

## 1.8.2-canary-20251210105424

### Patch Changes

- 3eb3f4a: fix(react): hydration error when wrapped in an SSR component

## 1.8.1

### Patch Changes

- Updated dependencies [0f55bf2]
  - c15t@1.8.1

## 1.8.0

### Minor Changes

- 68a7324: Full Changelog: https://c15t.com/changelog/2025-10-27-v1.8.0

### Patch Changes

- Updated dependencies [68a7324]
  - c15t@1.8.0

## 1.8.0-canary-20251112105612

### Minor Changes

- 7043a2e: feat: add configurable legal links to consent banner and consent dialog
- bee7789: feat(core): identify users before & after consent is set
  feat(backend): add endpoint to identify subject with consent ID
  refactor(core): improved structure of client API & removed unused options
- 69d6680: feat: country, region & language overrides

### Patch Changes

- 31953f4: refactor: improve package exports ensuring React has same exports as core
- 6e3034c: refactor: update rslib to latest version
- Updated dependencies [31953f4]
- Updated dependencies [7043a2e]
- Updated dependencies [6e3034c]
- Updated dependencies [bee7789]
- Updated dependencies [b3df4d0]
- Updated dependencies [69d6680]
  - c15t@1.8.0-canary-20251112105612

## 1.8.0-canary-20251028143243

### Minor Changes

- a0fab48: feat(core): cookie/local-storage hybrid approach

### Patch Changes

- 067c7af: fix(react): frame component hydration error
- Updated dependencies [8f3f146]
- Updated dependencies [a0fab48]
  - c15t@1.8.0-canary-20251028143243

## 1.7.0

### Minor Changes

- aa16d03: You can find the full changelog at https://c15t.com/changelog/2025-10-11-v1.7.0

### Patch Changes

- Updated dependencies [aa16d03]
  - c15t@1.7.0

## 1.7.0-canary-20251014174050

### Patch Changes

- 87ce89f: fix(react): missing use-client causing build errors in Next.js 14

## 1.7.0-canary-20251012181938

### Minor Changes

- 0c80bed: feat: added script loader, deprecated tracking blocker
- a58909c: feat(react): added frame component for conditionally rendering content with a placeholder e.g. iframes
  feat(core): added headless iframe blocking with the data-src & data-category attributes
  fix(react): improved button hover transitions when changing theme

### Patch Changes

- Updated dependencies [0c80bed]
- Updated dependencies [a58909c]
  - c15t@1.7.0-canary-20251012181938

## 1.6.1

### Patch Changes

- 6257a20: fix(react): dialog scroll lock persisting after closure

## 1.6.0

### Minor Changes

- 84ab0c7: For a full detailed changelog see the [v1.6.0 release notes](https://c15t.com/changelog/2025-09-08-v1.6.0).

### Patch Changes

- Updated dependencies [84ab0c7]
  - c15t@1.6.0
