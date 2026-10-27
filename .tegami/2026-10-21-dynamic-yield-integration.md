---
packages:
  "@c15t/integrations":
    replay:
      - exit-prerelease(npm:@c15t/integrations)
  "@c15t/scripts":
    replay:
      - exit-prerelease(npm:@c15t/scripts)
  "@c15t/cli":
    replay:
      - exit-prerelease(npm:@c15t/cli)
---

### Add Dynamic Yield consent integration

`dynamicYield()` from `@c15t/integrations/dynamic-yield` loads Dynamic Yield after `experience` consent and sends the choice through Dynamic Yield's Active Cookie Consent API. The CLI can add it during setup.
