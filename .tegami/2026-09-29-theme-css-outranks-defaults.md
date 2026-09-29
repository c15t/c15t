---
packages:
  '@c15t/ui': patch
  '@c15t/browser': patch
---

### Apply `generateThemeCSS` output wherever it lands in the page

A theme rendered with `generateThemeCSS` used the same selectors as the
default tokens in `styles.css`, so whichever came later in the document won.
SvelteKit writes `<svelte:head>` content before its stylesheet links, so a
theme rendered there, as the SvelteKit guide shows, was replaced by the
defaults. The generated selectors now carry one more specificity point
(`:root:root`, `.c15t-theme-root.c15t-theme-root`), so the theme overrides
the defaults before or after the stylesheet. This covers `ConsentTheme` in
React, Next.js and TanStack Start, Astro's server-rendered theme and the
script tag's `theme` option too.

Your own CSS that sets `--c15t-*` variables on plain `:root` next to a
generated theme now loses to the theme. Put those values in the theme, or
raise the selector to `:root:root`.
