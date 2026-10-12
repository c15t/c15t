---
packages:
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
---

### Keep the Astro preference dialog styled

The preference dialog keeps its styles in production builds with
`ui: 'svelte'` and after ClientRouter navigations, and can be opened again
after a navigation. With `ui: 'vue'`, the dialog's CSS is no longer part of
the render-blocking page stylesheet.

With `styles: false`, import `@c15t/ui/styles/dialog.css` yourself, plus
`@c15t/ui/styles/primitives.css` with `ui: 'svelte'`.
