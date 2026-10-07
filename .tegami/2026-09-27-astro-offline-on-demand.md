---
packages:
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
---

### Keep offline mode out of the Astro page script for hosted and manifest sites

Hosted and manifest sites no longer ship offline mode and its recommended
policy-rule pack in the page script, about 10 KB gzipped. Offline mode loads in
its own chunk on the first browser init.
