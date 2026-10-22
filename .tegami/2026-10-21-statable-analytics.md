---
packages:
  '@c15t/integrations': minor
  '@c15t/cli': patch
  '@c15t/scripts': patch
---

### Add Statable analytics

`statableAnalytics` from `@c15t/integrations/statable-analytics` loads
Statable after `measurement` consent. Statable has no stop API, so keep the
default page reload when consent is withdrawn. The CLI can generate the
integration too.
