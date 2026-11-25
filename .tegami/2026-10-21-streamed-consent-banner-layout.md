---
packages:
  '@c15t/ui': patch
  '@c15t/react': patch
  '@c15t/vue': patch
  '@c15t/svelte': patch
  '@c15t/astro': patch
---

### Prevent partially parsed consent banners from shifting

Keep styled React, Vue/Nuxt, Svelte and Astro consent banners hidden until
their serialized contents finish parsing in browsers that support CSS
`:has()`. Vue/Nuxt, Svelte and Astro IAB banners now do the same, as React's
already did. Completed banners appear without waiting for hydration.

Banner roots now end with a hidden `[data-c15t-stream-end]` element.
Selectors such as `:last-child` and Tailwind `last:` on the root's children
match that marker. Target the content's part, class or test ID instead.
