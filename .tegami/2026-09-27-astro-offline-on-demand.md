---
packages:
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
---

### Keep offline mode out of the Astro page script for hosted and manifest sites

The page script the integration injects picks its transport at runtime, and it
imported the offline transport statically. Every hosted and manifest site
therefore shipped offline mode and its recommended policy-rule pack in the
script that runs on every page, where they never run: about 10 KB gzipped.
Offline mode now loads in its own chunk on the first browser init. An offline
page the server already resolved never inits, so it doesn't load the chunk
either.
