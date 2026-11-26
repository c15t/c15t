---
packages:
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
---

### Hide the "Secured by" tag when branding is `none`

A backend that sets `branding: 'none'` now hides the "Secured by" tag in every
stock UI, including the IAB banner. `KernelBranding` gains `'none'`.
