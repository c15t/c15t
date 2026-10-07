---
packages:
  "@c15t/integrations":
    replay:
      - exit-prerelease(npm:@c15t/integrations)
  "@c15t/cli":
    replay:
      - exit-prerelease(npm:@c15t/cli)
---

### Add a OneDollarStats integration

`oneDollarStats()` from `@c15t/integrations/one-dollar-stats` loads the
OneDollarStats tracker once measurement is allowed. It needs no API key.
Tracker settings are forwarded as `data-*` attributes, and `hostname` must be a
bare host. The CLI offers OneDollarStats in its integration picker.
