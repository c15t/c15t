---
packages:
  "@c15t/ui":
    replay:
      - exit-prerelease(npm:@c15t/ui)
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
---

### Apply `generateThemeCSS` output wherever it lands in the page

`generateThemeCSS` output used the same selectors as the default tokens in
`styles.css`, so a theme placed before the stylesheet, as SvelteKit's
`<svelte:head>` does, lost to the defaults. The generated selectors gain one
specificity point (`:root:root`, `.c15t-theme-root.c15t-theme-root`), so the
theme wins in either order. Inside a shadow root the theme still has to come
after the stylesheet. This applies to `ConsentTheme`, Astro's server-rendered
theme and the script tag's `theme` option.

Your own `--c15t-*` variables on plain `:root` next to a generated theme lose to
the theme. Move them into the theme or raise the selector to `:root:root`.
