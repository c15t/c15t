---
packages:
  '@c15t/integrations': minor
  '@c15t/scripts': patch
  '@c15t/cli': patch
---

### Add Dynamic Yield consent integration

`dynamicYield()` from `@c15t/integrations/dynamic-yield` loads Dynamic Yield after `experience` consent and sends the choice through Dynamic Yield's Active Cookie Consent API. The CLI can add it during setup.
