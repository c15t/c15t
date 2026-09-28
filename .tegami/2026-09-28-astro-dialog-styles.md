---
packages:
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
---

### Keep the Astro preference dialog styled

The preference dialog rendered without its styles in three cases:

- With `ui: 'svelte'`, production builds shipped none of the dialog's CSS.
- After a ClientRouter navigation, the dialog's stylesheet was gone from the
  page for every `ui`.
- A dialog opened before a navigation could not be opened again on the next
  page.

The browser runtime now links the dialog's stylesheets itself when the dialog
warms or opens, mounts the dialog once they have loaded, and keeps them through
ClientRouter navigations. A dialog open during a navigation stays open on the
new page. With `ui: 'vue'`, the dialog's rules, about 34 KB before
compression, are no longer part of the render-blocking page stylesheet.

With `styles: false`, import `@c15t/ui/styles/dialog.css` yourself, plus
`@c15t/ui/styles/primitives.css` with `ui: 'svelte'`.
