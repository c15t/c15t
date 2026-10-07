---
packages:
  "@c15t/integrations":
    replay:
      - exit-prerelease(npm:@c15t/integrations)
  "@c15t/scripts":
    replay:
      - exit-prerelease(npm:@c15t/scripts)
  "@c15t/cli":
    replay:
      - exit-prerelease(npm:@c15t/cli)
---

### Rename the vendor integrations package

Replace `@c15t/scripts` with `@c15t/integrations` in v3 dependencies and
imports. Vendor subpaths, helper names and the `scripts` configuration option
stay the same. `@c15t/scripts` stays available through v3 as a deprecated
package that re-exports the same code. Compatibility ends in v4.

The CLI uses `@c15t/integrations` in generated apps. Run `c15t codemods
scripts-to-integrations --dry-run --json` to preview import changes in
JavaScript and TypeScript files, then run it without `--dry-run` to apply them.
Update package dependencies and Vue or Svelte component imports yourself.
