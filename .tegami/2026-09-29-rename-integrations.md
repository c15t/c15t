---
packages:
  '@c15t/integrations': minor
  '@c15t/scripts': minor
  '@c15t/cli': patch
---

### Rename the vendor integrations package

Replace `@c15t/scripts` with `@c15t/integrations` in v3 dependencies and imports.
Vendor subpaths, helper names, and the `scripts` configuration option stay the
same. `@c15t/scripts` remains available as a deprecated compatibility package
throughout v3, re-exporting the same implementation and types. Compatibility
ends in v4; previously published versions remain available on npm.

The CLI installs and imports `@c15t/integrations` in generated applications.
Run `c15t codemods scripts-to-integrations --dry-run --json` to preview import
changes in JavaScript and TypeScript files, then repeat without `--dry-run` to
apply them. Update package dependencies and Vue or Svelte component imports
separately.
