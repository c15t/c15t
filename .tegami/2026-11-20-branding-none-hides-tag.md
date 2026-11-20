---
packages:
  "@c15t/browser": patch
  "@c15t/core": patch
---

### Hide the "Secured by" tag when branding is `none`

A backend that sets `branding: 'none'` now hides the "Secured by" tag in every
stock UI, including the IAB banner. `KernelBranding` gains `'none'`.
