---
packages:
  '@c15t/astro': patch
---

### Stop Astro dialog islands shipping a second stylesheet

The dialog islands import `@c15t/ui` class maps, which import their component
CSS in the browser. Astro links every stylesheet a page script can reach, so
with `ui: 'svelte'` every page loaded about 72 KB of dialog CSS on top of the
injected stylesheet that already contains it. With `styles` on, the
integration now resolves those class maps to their variant without CSS. With
`styles: false` the islands keep their own CSS.
