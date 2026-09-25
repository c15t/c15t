---
packages:
  '@c15t/astro': patch
---

### Explain why manifest mode needs an adapter

`manifest()` mode injects on-demand init and manifest routes. On a site with no
server adapter, Astro stopped the build with a generic "no adapter" error that
never mentioned those routes. The integration now fails first, names the
routes, and suggests `hosted()`, `offline()` or `endpoints: false` for static
hosting.
