---
packages:
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
---

### Explain why the injected Astro routes need an adapter

`manifest()` mode, or `endpoints: true` in any mode, injects on-demand routes.
Without a server adapter, `astro build` fails with an error that names those
routes and says how to build statically, instead of Astro's generic "no adapter"
error. `astro dev` and `astro sync` still run without one.
