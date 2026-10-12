---
packages:
  "@c15t/ui":
    replay:
      - exit-prerelease(npm:@c15t/ui)
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
---

### Stop banner and dialog motion under reduced motion in every adapter

With `prefers-reduced-motion: reduce`, Vue, Nuxt and Astro banners no longer
slide in. The fix also covers the sidebar dialog, button hovers, tab triggers,
the accordion row and the IAB tab indicator.
