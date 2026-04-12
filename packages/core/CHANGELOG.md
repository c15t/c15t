# c15t

## 2.0.0-rc.8

### Minor Changes

- 3d4c107: feat(consent): add change-only consent callbacks

  - add `onConsentChanged` as a dedicated callback for explicit consent saves that change an existing persisted consent state
  - include both previous and current consent categories in the callback payload so analytics and integrations can diff grant/revoke transitions directly
  - keep `onConsentSet` focused on broad consent-state updates, including initialization and auto-grant flows
  - update the React provider to keep callback registrations in sync when callback props change after mount

- c944e35: feat(core): move policy action resolution from @c15t/react to c15t core

  Policy-driven action resolution utilities (`resolvePolicyAllowedActions`, `resolvePolicyActionGroups`, `resolvePolicyPrimaryActions`, etc.) are now exported from `c15t` core for shared consent surface runtimes.

  feat(scripts): move bundled integrations to declarative, schema-versioned `VendorManifest` definitions compiled through `resolveManifest()`. The manifest runtime now supports structured startup and consent phases, complex consent conditions, compile caching, and Google Consent Mode v2 signaling without helper-authored lifecycle overrides.

  feat(dev-tools): add script lifecycle and manifest runtime telemetry to the events and scripts panels, including grouped activity traces for `onBeforeLoad`, `onLoad`, and `onConsentChange`.

### Patch Changes

- 43f1b68: - fix `identifyUser()` to consistently use the consent `subjectId` for `PATCH /subjects/:id`, keep the legacy `id` alias backward compatible, and tighten request typing plus retry handling for malformed pending identify submissions.
- 5956531: Simplify the 2.0 static prefetch flow so static routes only need to start `/init` early and matching prefetched data is consumed automatically during first store initialization.

  - `c15t`: add canonical request-context metadata for SSR and browser-prefetch payloads, auto-consume matching prefetched data on first runtime/store initialization, and replace blanket SSR skip-on-overrides behavior with exact request-context matching.
  - `@c15t/react`: preserve the dynamic SSR `fetchInitialData()` flow while exposing the new `context_mismatch` SSR status behavior for matching overrides, backend URLs, credentials, and ambient GPC.
  - `@c15t/nextjs`: remove the RC-era public static-prefetch consumer APIs from the package surface and document `C15tPrefetch` as the only static-route setup step.
  - `@c15t/cli`: update generated static-route templates to rely on automatic prefetch consumption instead of wiring manual prefetch lookups.

- Updated dependencies [3d5b0fd]
- Updated dependencies [fee82fd]
  - @c15t/schema@2.0.0-rc.5
  - @c15t/translations@2.0.0-rc.8

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

- bb3ab0f: chore: update dependencies, including zustand and typescript
- 1a724fc: fix(policy-packs): support multiple primary actions while keeping customize as the default primary action

  Expose `primaryActions` consistently across schema, backend, core, React, and dev-tools. Built-in preset and offline default policies keep `customize` as the default primary action, while custom policies can now mark multiple actions as primary.

- Updated dependencies [1a724fc]
  - @c15t/schema@2.0.0-rc.4

## 2.0.0-rc.5

### Minor Changes

- 372cf92: feat(policy): add policy packs for declarative regional consent resolution

  Policy packs let you define regional consent rules once — c15t resolves the right policy automatically based on visitor location. Resolution follows fixed priority: region → country → fallback → default.

  - Built-in presets: `europeOptIn()`, `europeIab()`, `californiaOptOut()`, `californiaOptIn()`, `quebecOptIn()`, `worldNoBanner()`
  - Per-policy GPC support via `consent.gpc` field
  - Fallback policies (`match.fallback`) as a safety net when geo-location headers are missing
  - Material policy fingerprints for automatic re-prompting when consent semantics change
  - Policy validation with `inspectPolicies()` for catching misconfigurations before deployment
  - Snapshot tokens (signed JWT) for write-time consistency between `/init` and consent writes
  - Dev-tools match trace panel showing full resolution path

### Patch Changes

- 021ac99: Bundle version-matched docs inside published c15t packages under `docs/**` for local agent and developer reference.

  Remove CLI `AGENTS.md` generation. Use the bundled package docs directly alongside c15t agent skills.

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

- 58fb392: Rename `c15t` mode references to `hosted` in core runtime and CLI generate flows.
  Add migration codemods and template updates for the hosted vs offline terminology.
- 60a51f1: fix: omit invalid optional subject identifiers when saving consent
- Updated dependencies [cfe1b2e]
- Updated dependencies [58fb392]
- Updated dependencies [e79f840]
- Updated dependencies [372cf92]
  - @c15t/schema@2.0.0-rc.3
  - @c15t/translations@2.0.0-rc.5

## Unreleased

- Bundle version-matched docs in the published package under `docs/**` for local developer and agent reference.

## 2.0.0-rc.4

### Patch Changes

- 29819bc: feat: add an IAB subpath export and lazy-load IAB internals
- Updated dependencies [06ee724]
  - @c15t/translations@2.0.0-rc.4

## 2.0.0-rc.3

### Patch Changes

- 1c813bc: feat(dev-tools): add GPC to dev-tools with an override
- 0f10f3e: fix(react): react compiler compatability
- Updated dependencies [0a18fb6]
  - @c15t/backend@2.0.0-rc.3

## 2.0.0-rc.2

### Patch Changes

- 408df0e: feat: CMP ID now comes from backend, either consent.io when hosted or BYO CMP ID
  feat: Center the IAB Banner for better policy compliance
  feat: Improve doc comments around IAB
- Updated dependencies [408df0e]
  - @c15t/backend@2.0.0-rc.2
  - @c15t/schema@2.0.0-rc.2

## 2.0.0-rc.1

### Patch Changes

- 0bc4f86: fixed workspace resolving
- Updated dependencies [0bc4f86]
  - @c15t/translations@2.0.0-rc.1
  - @c15t/backend@2.0.0-rc.1
  - @c15t/schema@2.0.0-rc.1

## 2.0.0-rc.0

### Major Changes

- 126a78b: https://v2.c15t.com/changelog/2026-02-12-v2.0.0-rc.0

### Patch Changes

- Updated dependencies [126a78b]
  - @c15t/backend@2.0.0-rc.0
  - @c15t/schema@2.0.0-rc.0
  - @c15t/translations@2.0.0-rc.0

## 2.0.0

### Major Changes

- **Breaking:** `showPopup` and `isPrivacyDialogOpen` replaced with single `activeUI` enum (`'none' | 'banner' | 'dialog'`)
- **Breaking:** `setShowPopup()` and `setIsPrivacyDialogOpen()` replaced with `setActiveUI(ui, options?)`
- feat: add Quebec Law 25 support

### Migration

| Before (1.x)                    | After (2.0)                              |
| ------------------------------- | ---------------------------------------- |
| `state.showPopup`               | `state.activeUI === 'banner'`            |
| `state.isPrivacyDialogOpen`     | `state.activeUI === 'dialog'`            |
| `setShowPopup(true, true)`      | `setActiveUI('banner', { force: true })` |
| `setShowPopup(false)`           | `setActiveUI('none')`                    |
| `setIsPrivacyDialogOpen(true)`  | `setActiveUI('dialog')`                  |
| `setIsPrivacyDialogOpen(false)` | `setActiveUI('none')`                    |

## 1.8.3

### Patch Changes

- 6c28663: Full Changelog: https://c15t.com/changelog/2026-01-19-v1.8.3

## 1.8.3-canary-20260109181827

### Patch Changes

- 486c46f: fix(core): normalize consent data handling in storage and store

## 1.8.3-canary-20251222100111

### Patch Changes

- 3d8eb68: fix(core): selected consents not updated when consents are auto-granted

## 1.8.3-canary-20251218133143

### Patch Changes

- 9eff7a7: fix(core): disable auto-grant consents when existing consent
- b7fafe6: fix(core): offline mode ignoring overrides

## 1.8.2

### Patch Changes

- 2ce4d5a: \* feat(core): Added ability to disable c15t with the `enabled` prop. c15t will grant all consents by default when disabled as well as loading all scripts by default. Useful for when you want to disable consent handling but still allow the integration code to be in place.

  - fix(react): Frame component CSS overriding
  - fix(react): Legal links using the asChild slot causing multi-child error

  https://c15t.com/changelog/2025-12-12-v1.8.2

## 1.8.2-canary-20251212163241

### Patch Changes

- a368512: fix(react): scripts not loading when c15t disabled

## 1.8.2-canary-20251212112113

### Patch Changes

- 7284b23: feat(core): add ability to disable c15t

## 1.8.1

### Patch Changes

- 0f55bf2: fix(core): identified flag not saved in browser storage

## 1.8.0

### Minor Changes

- 68a7324: Full Changelog: https://c15t.com/changelog/2025-10-27-v1.8.0

### Patch Changes

- Updated dependencies [68a7324]
  - @c15t/backend@1.8.0
  - @c15t/translations@1.8.0

## 1.8.0-canary-20251112105612

### Minor Changes

- 7043a2e: feat: add configurable legal links to consent banner and consent dialog
- bee7789: feat(core): identify users before & after consent is set
  feat(backend): add endpoint to identify subject with consent ID
  refactor(core): improved structure of client API & removed unused options
- b3df4d0: feat(core): scripts can now be in head and body
- 69d6680: feat: country, region & language overrides

### Patch Changes

- 31953f4: refactor: improve package exports ensuring React has same exports as core
- 6e3034c: refactor: update rslib to latest version
- Updated dependencies [221a553]
- Updated dependencies [7043a2e]
- Updated dependencies [6e3034c]
- Updated dependencies [bee7789]
- Updated dependencies [69d6680]
  - @c15t/translations@1.8.0-canary-20251112105612
  - @c15t/backend@1.8.0-canary-20251112105612

## 1.8.0-canary-20251028143243

### Minor Changes

- a0fab48: feat(core): cookie/local-storage hybrid approach

### Patch Changes

- 8f3f146: chore: update various dependancies
- Updated dependencies [8f3f146]
  - @c15t/backend@1.8.0-canary-20251028143243

## 1.7.0

### Minor Changes

- aa16d03: You can find the full changelog at https://c15t.com/changelog/2025-10-11-v1.7.0

### Patch Changes

- Updated dependencies [aa16d03]
  - @c15t/translations@1.7.0
  - @c15t/backend@1.7.0

## 1.7.0-canary-20251012181938

### Minor Changes

- 0c80bed: feat: added script loader, deprecated tracking blocker
- a58909c: feat(react): added frame component for conditionally rendering content with a placeholder e.g. iframes
  feat(core): added headless iframe blocking with the data-src & data-category attributes
  fix(react): improved button hover transitions when changing theme

### Patch Changes

- Updated dependencies [c6518dd]
- Updated dependencies [0c80bed]
- Updated dependencies [a58909c]
- Updated dependencies [9f4ef95]
  - @c15t/backend@1.7.0-canary-20251012181938
  - @c15t/translations@1.7.0-canary-20251012181938

## 1.6.0

### Minor Changes

- 84ab0c7: For a full detailed changelog see the [v1.6.0 release notes](https://c15t.com/changelog/2025-09-08-v1.6.0).

### Patch Changes

- Updated dependencies [84ab0c7]
  - @c15t/backend@1.6.0
  - @c15t/translations@1.6.0
