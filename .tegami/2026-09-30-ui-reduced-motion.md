---
packages:
  '@c15t/ui': patch
  '@c15t/browser': patch
---

### Stop banner and dialog motion under reduced motion in every adapter

The `prefers-reduced-motion: reduce` rules now use the same selectors as the rules that animate each part, so they win wherever an adapter puts the class. They were one class lighter for the banner and dialog, so Vue, Nuxt and Astro banners still slid in for visitors who asked for less motion. The fix also covers the sidebar dialog, secondary and dark button hovers, tab triggers, the accordion row and the IAB tab indicator.
