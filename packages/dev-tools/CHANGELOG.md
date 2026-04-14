# @c15t/dev-tools

## 2.0.0-rc.13

### Major Changes

- 3e2448f: https://v2.c15t.com/changelog/2026-02-12-v2.0.0-rc.0

### Patch Changes

- 3e2448f: feat(dev-tools): add GPC to dev-tools with an override
- 3e2448f: fixed workspace resolving
- 3e2448f: feat(dev-tools): ui improvements
- 3e2448f: chore: update dependencies, including zustand and typescript
- 3e2448f: Separate published declaration files from runtime bundles to improve Vite compatibility

  - Move generated `.d.ts` files out of `dist/` into `dist-types/` across published packages
  - Stop emitting declaration maps in shared TypeScript config so `.d.ts.map` files are no longer published
  - Emit declarations only once per package to avoid unstable output when both `esm` and `cjs` builds write types
  - Update package `types` metadata, publish file lists, Turbo outputs, and publish artifact checks for the new layout
  - Verify the package layout works in Vite 7 without `optimizeDeps.exclude` workarounds for `c15t` and `@c15t/react`

- 3e2448f: feat(dev-tools): add DevTools export
  feat(cli): add support for file structures like [locale]
  feat(cli): add c15t/skills
- 3e2448f: feat(dev-tools): add persisted overrides and improve debugging with resilient reconnects, richer events, interactive IAB controls, and better script/network diagnostics
- 3e2448f: fix(policy-packs): support multiple primary actions while keeping customize as the default primary action

  Expose `primaryActions` consistently across schema, backend, core, React, and dev-tools. Built-in preset and offline default policies keep `customize` as the default primary action, while custom policies can now mark multiple actions as primary.

- 3e2448f: feat(policy): add policy packs for declarative regional consent resolution

  Policy packs let you define regional consent rules once — c15t resolves the right policy automatically based on visitor location. Resolution follows fixed priority: region → country → fallback → default.

  - Built-in presets: `europeOptIn()`, `europeIab()`, `californiaOptOut()`, `californiaOptIn()`, `quebecOptIn()`, `worldNoBanner()`
  - Per-policy GPC support via `consent.gpc` field
  - Fallback policies (`match.fallback`) as a safety net when geo-location headers are missing
  - Material policy fingerprints for automatic re-prompting when consent semantics change
  - Policy validation with `inspectPolicies()` for catching misconfigurations before deployment
  - Snapshot tokens (signed JWT) for write-time consistency between `/init` and consent writes
  - Dev-tools match trace panel showing full resolution path

- Updated dependencies [3e2448f]
- Updated dependencies [3e2448f]
- Updated dependencies [3e2448f]
- Updated dependencies [3e2448f]
- Updated dependencies [3e2448f]
- Updated dependencies [3e2448f]
- Updated dependencies [3e2448f]
- Updated dependencies [3e2448f]
- Updated dependencies [3e2448f]
- Updated dependencies [3e2448f]
- Updated dependencies [3e2448f]
- Updated dependencies [3e2448f]
- Updated dependencies [3e2448f]
- Updated dependencies [3e2448f]
- Updated dependencies [3e2448f]
- Updated dependencies [3e2448f]
  - c15t@2.0.0-rc.13

## 2.0.0-rc.10

### Patch Changes

- 64d6009: Replace the shared `clsx` dependency with a local `cn` implementation owned by `@c15t/ui`.

  - `@c15t/ui`: own the public `ClassValue` type and `cn(...)` implementation directly instead of re-exporting them from `clsx`, with coverage for nested arrays, object maps, numeric values, and ordering.
  - `@c15t/react`: continue consuming the shared `@c15t/ui` class helper while dropping the now-unused direct `clsx` dependency from the published package.
  - `@c15t/dev-tools`: remove the unused direct `clsx` dependency from the published package manifest.

- Updated dependencies [9579b62]
  - c15t@2.0.0-rc.10

## 2.0.0-rc.8

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

- Updated dependencies [43f1b68]
- Updated dependencies [3d4c107]
- Updated dependencies [c944e35]
- Updated dependencies [5956531]
  - c15t@2.0.0-rc.8

## 2.0.0-rc.6

### Patch Changes

- bb3ab0f: chore: update dependencies, including zustand and typescript
- 1a724fc: fix(policy-packs): support multiple primary actions while keeping customize as the default primary action

  Expose `primaryActions` consistently across schema, backend, core, React, and dev-tools. Built-in preset and offline default policies keep `customize` as the default primary action, while custom policies can now mark multiple actions as primary.

- Updated dependencies [e08e52c]
- Updated dependencies [bb3ab0f]
- Updated dependencies [1a724fc]
  - c15t@2.0.0-rc.6

## 2.0.0-rc.5

### Patch Changes

- e79f840: Separate published declaration files from runtime bundles to improve Vite compatibility

  - Move generated `.d.ts` files out of `dist/` into `dist-types/` across published packages
  - Stop emitting declaration maps in shared TypeScript config so `.d.ts.map` files are no longer published
  - Emit declarations only once per package to avoid unstable output when both `esm` and `cjs` builds write types
  - Update package `types` metadata, publish file lists, Turbo outputs, and publish artifact checks for the new layout
  - Verify the package layout works in Vite 7 without `optimizeDeps.exclude` workarounds for `c15t` and `@c15t/react`

- 372cf92: feat(policy): add policy packs for declarative regional consent resolution

  Policy packs let you define regional consent rules once — c15t resolves the right policy automatically based on visitor location. Resolution follows fixed priority: region → country → fallback → default.

  - Built-in presets: `europeOptIn()`, `europeIab()`, `californiaOptOut()`, `californiaOptIn()`, `quebecOptIn()`, `worldNoBanner()`
  - Per-policy GPC support via `consent.gpc` field
  - Fallback policies (`match.fallback`) as a safety net when geo-location headers are missing
  - Material policy fingerprints for automatic re-prompting when consent semantics change
  - Policy validation with `inspectPolicies()` for catching misconfigurations before deployment
  - Snapshot tokens (signed JWT) for write-time consistency between `/init` and consent writes
  - Dev-tools match trace panel showing full resolution path

- Updated dependencies [021ac99]
- Updated dependencies [5f30a3b]
- Updated dependencies [58fb392]
- Updated dependencies [e79f840]
- Updated dependencies [58fb392]
- Updated dependencies [60a51f1]
- Updated dependencies [372cf92]
  - c15t@2.0.0-rc.5

## 1.8.5

### Patch Changes

- be4e218: Republish patch release to fix workspace dependency protocol resolution during publish.

  Published package manifests now resolve `workspace:*` references to concrete semver ranges before release.

- Updated dependencies [be4e218]
  - c15t@1.8.5

## 1.8.4

### Patch Changes

- 8defcd9: Update direct and transitive dependencies to address known vulnerabilities and keep runtime/tooling packages current.
- Updated dependencies [8defcd9]
  - c15t@1.8.4

## 1.8.3

### Patch Changes

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

- Updated dependencies [9eff7a7]
- Updated dependencies [b7fafe6]
  - c15t@1.8.3-canary-20251218133143

## 1.8.2

### Patch Changes

- Updated dependencies [2ce4d5a]
  - c15t@1.8.2

## 1.8.2-canary-20251212163241

### Patch Changes

- Updated dependencies [a368512]
  - c15t@1.8.2-canary-20251212163241

## 1.8.2-canary-20251212112113

### Patch Changes

- Updated dependencies [7284b23]
  - c15t@1.8.2-canary-20251212112113

## 1.8.1

### Patch Changes

- Updated dependencies [0f55bf2]
  - c15t@1.8.1

## 1.8.0

### Patch Changes

- Updated dependencies [68a7324]
  - c15t@1.8.0

## 1.8.0-canary-20251112105612

### Patch Changes

- 6e3034c: refactor: update rslib to latest version
- Updated dependencies [31953f4]
- Updated dependencies [7043a2e]
- Updated dependencies [6e3034c]
- Updated dependencies [bee7789]
- Updated dependencies [b3df4d0]
- Updated dependencies [69d6680]
  - c15t@1.8.0-canary-20251112105612

## 1.8.0-canary-20251028143243

### Patch Changes

- Updated dependencies [8f3f146]
- Updated dependencies [a0fab48]
  - c15t@1.8.0-canary-20251028143243

## 1.7.0

### Patch Changes

- Updated dependencies [aa16d03]
  - c15t@1.7.0

## 1.7.0-canary-20251012181938

### Patch Changes

- Updated dependencies [0c80bed]
- Updated dependencies [a58909c]
  - c15t@1.7.0-canary-20251012181938

## 1.6.0

### Patch Changes

- Updated dependencies [84ab0c7]
  - c15t@1.6.0
