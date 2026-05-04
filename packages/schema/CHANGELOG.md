# @c15t/schema

## 2.0.1

### Patch Changes

- 748536a: Refine policy category scope handling.

## 2.0.0

### Major Changes

- 32617c9: Changelog available at https://c15t.com/changelog/2026-04-14-v2.0.0

## 2.0.0-rc.6

### Patch Changes

- 9579b62: Add token-first legal-document consent groundwork for `2.0`.

  - `c15t`: expand the unstable policy-consent input types so legal-document writes can prefer `documentSnapshotToken`, fall back to `policyHash`, and keep `policyId` only as a compatibility path.
  - `@c15t/backend`: update legal-document consent writes to resolve append-only consent against a verified document snapshot token when configured, or against a provided document hash when only lighter-weight release proof is available.
  - `@c15t/schema`: extend the subject consent schema and error shapes for legal-document snapshot tokens and hash-based legal-document resolution.

## 2.0.0-rc.5

### Patch Changes

- 3d5b0fd: Add legal-document snapshot support, persist document hashes on consent policies, and expose subject consent policy version/hash/effective-date metadata.

## 2.0.0-rc.4

### Patch Changes

- 1a724fc: fix(policy-packs): support multiple primary actions while keeping customize as the default primary action

  Expose `primaryActions` consistently across schema, backend, core, React, and dev-tools. Built-in preset and offline default policies keep `customize` as the default primary action, while custom policies can now mark multiple actions as primary.

## 2.0.0-rc.3

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

## 2.0.0-rc.2

### Patch Changes

- 408df0e: feat: CMP ID now comes from backend, either consent.io when hosted or BYO CMP ID
  feat: Center the IAB Banner for better policy compliance
  feat: Improve doc comments around IAB

## 2.0.0-rc.1

### Patch Changes

- 0bc4f86: fixed workspace resolving

## 2.0.0-rc.0

### Major Changes

- 126a78b: https://c15t.com/changelog/2026-02-12-v2.0.0-rc.0
