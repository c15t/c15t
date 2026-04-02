# @c15t/node-sdk

## 2.0.0-rc.6

### Patch Changes

- Updated dependencies [bb3ab0f]
- Updated dependencies [1a724fc]
  - @c15t/backend@2.0.0-rc.6

## 2.0.0-rc.5

### Patch Changes

- e79f840: Separate published declaration files from runtime bundles to improve Vite compatibility

  - Move generated `.d.ts` files out of `dist/` into `dist-types/` across published packages
  - Stop emitting declaration maps in shared TypeScript config so `.d.ts.map` files are no longer published
  - Emit declarations only once per package to avoid unstable output when both `esm` and `cjs` builds write types
  - Update package `types` metadata, publish file lists, Turbo outputs, and publish artifact checks for the new layout
  - Verify the package layout works in Vite 7 without `optimizeDeps.exclude` workarounds for `c15t` and `@c15t/react`

- Updated dependencies [021ac99]
- Updated dependencies [cfe1b2e]
- Updated dependencies [e79f840]
- Updated dependencies [372cf92]
  - @c15t/backend@2.0.0-rc.5

## 1.8.5

### Patch Changes

- be4e218: Republish patch release to fix workspace dependency protocol resolution during publish.

  Published package manifests now resolve `workspace:*` references to concrete semver ranges before release.

- Updated dependencies [be4e218]
  - @c15t/backend@1.8.5

## 1.8.4

### Patch Changes

- 8defcd9: Update direct and transitive dependencies to address known vulnerabilities and keep runtime/tooling packages current.
- Updated dependencies [8defcd9]
  - @c15t/backend@1.8.4

## 1.8.0

### Patch Changes

- Updated dependencies [68a7324]
  - @c15t/backend@1.8.0

## 1.8.0-canary-20251112105612

### Patch Changes

- 6e3034c: refactor: update rslib to latest version
- Updated dependencies [7043a2e]
- Updated dependencies [6e3034c]
- Updated dependencies [bee7789]
- Updated dependencies [69d6680]
  - @c15t/backend@1.8.0-canary-20251112105612

## 1.8.0-canary-20251028143243

### Patch Changes

- 8f3f146: chore: update various dependancies
- Updated dependencies [8f3f146]
  - @c15t/backend@1.8.0-canary-20251028143243

## 1.7.0

### Patch Changes

- Updated dependencies [aa16d03]
  - @c15t/backend@1.7.0

## 1.7.0-canary-20251012181938

### Patch Changes

- Updated dependencies [c6518dd]
- Updated dependencies [a58909c]
- Updated dependencies [9f4ef95]
  - @c15t/backend@1.7.0-canary-20251012181938

## 1.6.0

### Patch Changes

- Updated dependencies [84ab0c7]
  - @c15t/backend@1.6.0
