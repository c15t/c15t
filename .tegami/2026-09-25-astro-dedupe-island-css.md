---
packages:
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
---

### Stop Astro dialog islands shipping a second stylesheet

With `ui: 'svelte'`, every page loaded about 72 KB of dialog CSS that the
injected stylesheet already contained, because the dialog islands imported
`@c15t/ui` class maps with their CSS. With `styles` on, the integration resolves
those class maps without CSS. With `styles: false` the islands keep their own
CSS.
