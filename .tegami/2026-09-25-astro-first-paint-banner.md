---
packages:
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
---

### Show the offline Astro banner at first paint on prerendered pages

A prerendered banner shows at first paint when the visitor has nothing stored
under any consent key, instead of waiting for module scripts. Visitors with a
stored record still wait for the runtime. The new `buildBannerRevealScript`
helper is exported from `@c15t/astro/server`.
