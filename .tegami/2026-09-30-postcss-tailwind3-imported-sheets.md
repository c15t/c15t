---
packages:
  '@c15t/ui': patch
---

### Unwrap imported c15t stylesheets for Tailwind 3

`@c15t/ui/postcss-tailwind3` now unwraps every `@layer` block that comes from a built c15t stylesheet, judged by the file the block was written in. Before, it only looked at the file being processed, so it missed stylesheets that reach Tailwind 3 through an `@import`:

- `@import '@c15t/svelte/styles.css'` in an app stylesheet. Tailwind 3 treated c15t's rules as part of its own components layer and purged them, leaving the Svelte and SvelteKit banner unstyled.
- `@c15t/astro/styles.css`, which Astro injects on every page. The Astro build failed with "`@layer components` is used but no matching `@tailwind components` directive is present".
- `@c15t/browser/styles.css`, for script tag pages that mount the UI in the light DOM.

The plugin also recognizes c15t stylesheets whose path carries a query, such as the `?transform-only` Astro adds to the dialog stylesheet.
