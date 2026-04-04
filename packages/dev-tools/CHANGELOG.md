# @c15t/dev-tools

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
