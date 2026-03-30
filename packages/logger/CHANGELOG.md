# @c15t/logger

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

- 126a78b: https://v2.c15t.com/changelog/2026-02-12-v2.0.0-rc.0

## 1.0.1

### Patch Changes

- 68a7324: Full Changelog: https://c15t.com/changelog/2025-10-27-v1.8.0

## 1.0.1-canary-20251112105612

### Patch Changes

- 6e3034c: refactor: update rslib to latest version

## 1.0.0

### Major Changes

- aa16d03: You can find the full changelog at https://c15t.com/changelog/2025-10-11-v1.7.0

## 1.0.0-canary-20251012181938

### Major Changes

- c6518dd: refactor: added @c15t/logger package
