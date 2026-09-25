---
packages:
  '@c15t/astro': patch
---

### Accept Astro 6 and 7

`@c15t/astro` now lists `astro` 5, 6 and 7 as peer dependencies, so package
managers stop warning when you install it into a current Astro project.

On the Cloudflare adapter for Astro 6 and later, background manifest refreshes
and session reports now use `waitUntil` from `Astro.locals.cfContext`. They
still use `Astro.locals.runtime.ctx` on Astro 5.
