---
packages:
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Accept `colorScheme: null` in Astro

The integration's `colorScheme` accepts `null`, meaning the same as `'none'`, so
c15t neither sets nor clears `c15t-dark` on `<html>`. React, Vue and Svelte use
`null` for this, so one config works in all of them.
