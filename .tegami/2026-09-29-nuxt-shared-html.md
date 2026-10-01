---
packages:
  '@c15t/vue': patch
  c15t: patch
---

### Resolve Nuxt visitors in the browser on prerendered and cached routes

Nuxt pages that are prerendered, or cached by a `cache`, `swr`, `isr` or `prerender` route rule, no longer carry the consent records, location and request headers of the render that produced them. That HTML is served to every visitor, so it now renders without the banner, and the browser requests the visitor's policy and reads their stored choice after hydration. Before, the browser reused the build-time or first visitor's result and skipped its own policy request, and a visitor who rejected saw the banner again after a reload.

In the browser, a newer denial kept in localStorage now also applies on top of the records the server read from the request cookie, instead of being overwritten by them.
