---
packages:
  "@c15t/integrations":
    replay:
      - exit-prerelease(npm:@c15t/integrations)
  "@c15t/cli":
    replay:
      - exit-prerelease(npm:@c15t/cli)
  "@c15t/scripts":
    replay:
      - exit-prerelease(npm:@c15t/scripts)
---

### Add Statable analytics

`statableAnalytics` from `@c15t/integrations/statable-analytics` loads
Statable after `measurement` consent. Statable has no stop API, so keep the
default page reload when consent is withdrawn. The CLI can generate the
integration too.
