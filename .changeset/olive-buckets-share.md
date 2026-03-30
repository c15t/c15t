---
"@c15t/backend": patch
"@c15t/cli": patch
"c15t": patch
"@c15t/dev-tools": patch
"@c15t/logger": patch
"@c15t/nextjs": patch
"@c15t/node-sdk": patch
"@c15t/react": patch
"@c15t/schema": patch
"@c15t/scripts": patch
"@c15t/translations": patch
"@c15t/ui": patch
---

Separate published declaration files from runtime bundles to improve Vite compatibility

- Move generated `.d.ts` files out of `dist/` into `dist-types/` across published packages
- Stop emitting declaration maps in shared TypeScript config so `.d.ts.map` files are no longer published
- Emit declarations only once per package to avoid unstable output when both `esm` and `cjs` builds write types
- Update package `types` metadata, publish file lists, Turbo outputs, and publish artifact checks for the new layout
- Verify the package layout works in Vite 7 without `optimizeDeps.exclude` workarounds for `c15t` and `@c15t/react`
