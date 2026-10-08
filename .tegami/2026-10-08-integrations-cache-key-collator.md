---
packages:
  '@c15t/integrations': patch
  '@c15t/core': patch
---

### Stop the first vendor helper call from loading the ICU collator

Integration helpers such as `googleTagManager()` and `metaPixel()` built their
manifest cache key by sorting config keys with `localeCompare`. The first
`localeCompare` call in a page makes the browser set up its collator, so a page
that had not compared strings yet paid for it on the first helper call. The
cache key now sorts keys with a plain comparison.

The preference draft's vendor list sort had the same problem. It now uses
`compareCanonical` like the rest of core, so mounting a preference center no
longer loads the collator either.

In headless Chromium with 4x CPU throttling, a page that calls the GTM, GA4 and
Meta Pixel helpers spends about 30 ms less on the main thread during load.
