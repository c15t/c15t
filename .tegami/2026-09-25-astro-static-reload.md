---
packages:
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
---

### Keep visitors' choices on prerendered Astro pages

Prerendered Astro pages no longer read the build request's headers or
cookie. They used to carry the build's empty consent record, which overrode
the visitor's cookie, so every reload asked again. Astro's warning about
reading `Astro.request.headers` on a prerendered page is gone too.
