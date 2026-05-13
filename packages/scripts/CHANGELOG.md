# @c15t/scripts

## 2.0.1

### Patch Changes

- e2b9f7b: Fix vendor bootstrap queue payloads so Google, Meta Pixel, and X Pixel receive
  real `arguments` objects instead of flattened arrays, and add contract tests for
  all shipped script helpers to verify their load-time handshakes.

## 2.0.0

### Major Changes

- 32617c9: Changelog available at https://c15t.com/changelog/2026-04-14-v2.0.0

## 1.1.0-rc.1

### Minor Changes

- c944e35: feat(core): move policy action resolution from @c15t/react to c15t core

  Policy-driven action resolution utilities (`resolvePolicyAllowedActions`, `resolvePolicyActionGroups`, `resolvePolicyPrimaryActions`, etc.) are now exported from `c15t` core for shared consent surface runtimes.

  feat(scripts): move bundled integrations to declarative, schema-versioned `VendorManifest` definitions compiled through `resolveManifest()`. The manifest runtime now supports structured startup and consent phases, complex consent conditions, compile caching, and Google Consent Mode v2 signaling without helper-authored lifecycle overrides.

  feat(dev-tools): add script lifecycle and manifest runtime telemetry to the events and scripts panels, including grouped activity traces for `onBeforeLoad`, `onLoad`, and `onConsentChange`.

### Patch Changes

- 918a70e: Fix published TypeScript declaration packaging so consumers stay compatible across both TypeScript 5 and TypeScript 6.

  - `@c15t/react`: correct the `./primitives` type export entries so they point at the published `dist-types` files instead of missing declaration paths.
  - `@c15t/backend`, `@c15t/cli`, `@c15t/dev-tools`, `@c15t/logger`, `@c15t/node-sdk`, and `@c15t/scripts`: normalize emitted `dist-types` imports during builds so published declarations no longer reference sibling `.d.ts` files directly, which could break consumers on newer TypeScript versions.
  - Tooling: make declaration normalization discover package targets dynamically so the compatibility fix applies consistently across published packages instead of only a hardcoded subset.

## 1.0.2-rc.0

### Patch Changes

- e79f840: Separate published declaration files from runtime bundles to improve Vite compatibility

  - Move generated `.d.ts` files out of `dist/` into `dist-types/` across published packages
  - Stop emitting declaration maps in shared TypeScript config so `.d.ts.map` files are no longer published
  - Emit declarations only once per package to avoid unstable output when both `esm` and `cjs` builds write types
  - Update package `types` metadata, publish file lists, Turbo outputs, and publish artifact checks for the new layout
  - Verify the package layout works in Vite 7 without `optimizeDeps.exclude` workarounds for `c15t` and `@c15t/react`

## 2.0.0-rc.1

### Patch Changes

- 0bc4f86: fixed workspace resolving

## 2.0.0-rc.0

### Major Changes

- 126a78b: https://c15t.com/changelog/2026-02-12-v2.0.0-rc.0

## 1.0.1

### Patch Changes

- 68a7324: Full Changelog: https://c15t.com/changelog/2025-10-27-v1.8.0

## 1.0.1-canary-20251112105612

### Patch Changes

- 5f75d2f: feat: add databuddy integration
- 6e3034c: refactor: update rslib to latest version

## 1.0.0

### Major Changes

- aa16d03: You can find the full changelog at https://c15t.com/changelog/2025-10-11-v1.7.0

## 1.0.0-canary-20251012181938

### Major Changes

- 0c80bed: feat: added script loader, deprecated tracking blocker

## 1.6.0

### Minor Changes

- 84ab0c7: For a full detailed changelog see the [v1.6.0 release notes](https://c15t.com/changelog/2025-09-08-v1.6.0).
