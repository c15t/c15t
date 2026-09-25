---
packages:
  '@c15t/astro': patch
---

### Explain why the injected Astro routes need an adapter

`manifest()` mode, or `endpoints: true` in any mode, injects on-demand init and
manifest routes. On a site with no server adapter, `astro build` stopped with a
generic "no adapter" error that never mentioned those routes. The integration
now fails the build first, names the routes, and says how to build statically.
`astro dev` and `astro sync` still run without an adapter, as Astro allows.
