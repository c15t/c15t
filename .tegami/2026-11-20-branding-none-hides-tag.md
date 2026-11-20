---
packages:
  "@c15t/browser": patch
  "@c15t/core": patch
---

### Hide the "Secured by" tag when the backend sets branding to `none`

Sites whose backend returns `branding: 'none'` from `/init` now hide the
"Secured by" tag across the stock banner and preference dialog in React, Vue,
Svelte, Astro, and the script-tag UI. Previously `@c15t/core` dropped `'none'`
while mapping `/init` responses, and `@c15t/browser` always rendered a brand
tag even when the snapshot branding was `'none'`.

`KernelBranding` now includes `'none'`. Omitted or `null` branding still shows
the default c15t tag.
