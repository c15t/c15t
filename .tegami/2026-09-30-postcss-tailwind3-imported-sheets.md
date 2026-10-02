---
packages:
  "@c15t/ui":
    replay:
      - exit-prerelease(npm:@c15t/ui)
---

### Unwrap every c15t stylesheet for Tailwind 3

`@c15t/ui/postcss-tailwind3` now unwraps the `@layer` blocks of every built stylesheet a c15t package publishes, not only those of `@c15t/ui` and `@c15t/browser`. Two setups failed before:

- `@import '@c15t/svelte/styles.css'` in an app stylesheet. Tailwind 3 treated c15t's rules as part of its own components layer and purged them, leaving the Svelte and SvelteKit banner unstyled.
- `@c15t/astro/styles.css`, which Astro injects on every page. The Astro build failed with "`@layer components` is used but no matching `@tailwind components` directive is present".

The plugin also recognizes c15t stylesheets whose path carries a query, such as the `?transform-only` Astro adds to the dialog stylesheet.

A stylesheet under `packages/<name>/dist/` of a workspace only counts as c15t's when that package's `package.json` is named `c15t` or `@c15t/*`. Before, any `packages/ui/dist` or `packages/browser/dist` stylesheet matched, so another monorepo's own packages could lose their `@layer` blocks.
