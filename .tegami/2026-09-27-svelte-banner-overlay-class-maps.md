---
packages:
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
---

### Keep the dialog and IAB styles out of the Svelte banner's first load

The overlay behind `ConsentBanner` imported the class maps of the consent
dialog, the IAB banner and the IAB dialog as well as the banner's own, so
every page with a banner shipped all four. Where a class map imports its
stylesheet, the IAB and dialog CSS came with them. The overlay now takes its
class names from the banner or dialog that renders it.
