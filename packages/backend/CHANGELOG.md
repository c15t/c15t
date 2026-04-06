# @c15t/backend

## 2.0.0-rc.6

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

- cfe1b2e: feat: Add edge-compatible `/init` handler for running consent policy resolution at the edge

  - `c15tEdgeInit()` — drop-in `/init` replacement for Vercel Middleware, Cloudflare Workers, and Deno Deploy
  - `resolveConsent()` — lightweight synchronous resolver for custom consent cookie flows
  - `resolvePolicySync()` — synchronous policy matching without fingerprint computation
  - Refactored `/init` route to use shared `resolveInitPayload` (no behavior change)

- e79f840: Separate published declaration files from runtime bundles to improve Vite compatibility

  - Move generated `.d.ts` files out of `dist/` into `dist-types/` across published packages
  - Stop emitting declaration maps in shared TypeScript config so `.d.ts.map` files are no longer published
  - Emit declarations only once per package to avoid unstable output when both `esm` and `cjs` builds write types
  - Update package `types` metadata, publish file lists, Turbo outputs, and publish artifact checks for the new layout
  - Verify the package layout works in Vite 7 without `optimizeDeps.exclude` workarounds for `c15t` and `@c15t/react`

- Updated dependencies [cfe1b2e]
- Updated dependencies [58fb392]
- Updated dependencies [e79f840]
- Updated dependencies [372cf92]
  - @c15t/schema@2.0.0-rc.3
  - @c15t/translations@2.0.0-rc.5
  - @c15t/logger@1.0.2-rc.0

## Unreleased

- Bundle version-matched docs in the published package under `docs/**` for local developer and agent reference.

## 2.0.0-rc.4

### Patch Changes

- 4c8435c: refactor(backend): flatten backend API entrypoints and improve TypeScript DX
- Updated dependencies [06ee724]
  - @c15t/translations@2.0.0-rc.4

## 2.0.0-rc.3

### Patch Changes

- 0a18fb6: feat(backend): add base '/' root endpoint for better DX

## 2.0.0-rc.2

### Patch Changes

- 408df0e: feat: CMP ID now comes from backend, either consent.io when hosted or BYO CMP ID
  feat: Center the IAB Banner for better policy compliance
  feat: Improve doc comments around IAB
- Updated dependencies [408df0e]
  - @c15t/schema@2.0.0-rc.2

## 2.0.0-rc.1

### Patch Changes

- 0bc4f86: fixed workspace resolving
- Updated dependencies [0bc4f86]
  - @c15t/translations@2.0.0-rc.1
  - @c15t/logger@2.0.0-rc.1
  - @c15t/schema@2.0.0-rc.1

## 2.0.0-rc.0

### Major Changes

- 126a78b: https://v2.c15t.com/changelog/2026-02-12-v2.0.0-rc.0

### Patch Changes

- Updated dependencies [126a78b]
  - @c15t/logger@2.0.0-rc.0
  - @c15t/schema@2.0.0-rc.0
  - @c15t/translations@2.0.0-rc.0

## 1.8.0

### Minor Changes

- 68a7324: Full Changelog: https://c15t.com/changelog/2025-10-27-v1.8.0

### Patch Changes

- Updated dependencies [68a7324]
  - @c15t/translations@1.8.0
  - @c15t/logger@1.0.1

## 1.8.0-canary-20251112105612

### Minor Changes

- 7043a2e: feat: add configurable legal links to consent banner and consent dialog
- bee7789: feat(core): identify users before & after consent is set
  feat(backend): add endpoint to identify subject with consent ID
  refactor(core): improved structure of client API & removed unused options
- 69d6680: feat: country, region & language overrides

### Patch Changes

- 6e3034c: refactor: update rslib to latest version
- Updated dependencies [221a553]
- Updated dependencies [7043a2e]
- Updated dependencies [6e3034c]
  - @c15t/translations@1.8.0-canary-20251112105612
  - @c15t/logger@1.0.1-canary-20251112105612

## 1.8.0-canary-20251028143243

### Patch Changes

- 8f3f146: chore: update various dependancies

## 1.7.0

### Patch Changes

- aa16d03: You can find the full changelog at https://c15t.com/changelog/2025-10-11-v1.7.0
- Updated dependencies [aa16d03]
  - @c15t/logger@1.0.0
  - @c15t/translations@1.7.0

## 1.7.0-canary-20251012181938

### Minor Changes

- a58909c: feat(react): added frame component for conditionally rendering content with a placeholder e.g. iframes
  feat(core): added headless iframe blocking with the data-src & data-category attributes
  fix(react): improved button hover transitions when changing theme

### Patch Changes

- c6518dd: refactor: added @c15t/logger package
- 9f4ef95: fix(backend): handle multiple sub domains
- Updated dependencies [c6518dd]
- Updated dependencies [0c80bed]
- Updated dependencies [a58909c]
  - @c15t/logger@1.0.0-canary-20251012181938
  - @c15t/translations@1.7.0-canary-20251012181938

## 1.6.0

### Minor Changes

- 84ab0c7: For a full detailed changelog see the [v1.6.0 release notes](https://c15t.com/changelog/2025-09-08-v1.6.0).

### Patch Changes

- Updated dependencies [84ab0c7]
  - @c15t/translations@1.6.0
