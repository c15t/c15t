---
packages:
  "@c15t/ui":
    replay:
      - exit-prerelease(npm:@c15t/ui)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Let clicks through the banner's empty space and lower its z-index

A non-blocking banner no longer swallows clicks outside its card. The padding around a floating card and the strip beside the "Secured by" tag on a bar were part of the banner's fixed box, so page links and buttons under them did nothing. Clicks there now reach the page. The card and tag still take clicks, and a blocking banner still catches all of them.

Set `--consent-banner-z-index` and `--consent-banner-overlay-z-index` to put a navbar, drawer or chat widget above the banner. The IAB banner takes `--iab-consent-banner-z-index` and `--iab-consent-banner-overlay-z-index`. Defaults are unchanged.

A top bar now pads its card by `env(safe-area-inset-top)`, as a bottom bar already did for the bottom inset, so its content clears the notch on pages that set `viewport-fit=cover`.
