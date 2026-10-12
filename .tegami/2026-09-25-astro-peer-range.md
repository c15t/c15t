---
packages:
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
---

### Accept Astro 6 and 7

`@c15t/astro` lists `astro` 5, 6 and 7 as peer dependencies. On Cloudflare with
Astro 6+, background work uses `waitUntil` from `Astro.locals.cfContext`.
