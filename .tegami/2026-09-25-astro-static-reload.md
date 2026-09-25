---
packages:
  '@c15t/astro': patch
---

### Keep visitors' choices on prerendered Astro pages

A prerendered page no longer reads the build request's headers or cookie. The
page used to carry the build's empty consent record, which the browser
preferred over the visitor's stored cookie, so every reload asked again. The
browser now reads the visitor's own cookie. Astro's warning about reading
`Astro.request.headers` on a prerendered page is gone too.
