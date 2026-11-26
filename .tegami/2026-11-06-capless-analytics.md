---
packages:
  '@c15t/integrations': minor
  '@c15t/cli': patch
  '@c15t/scripts': patch
---

### Add Capless analytics integration

`caplessAnalytics` from `@c15t/integrations/capless-analytics` loads Capless
analytics and session replay after `measurement` consent. Capless cannot stop a
running replay, so keep the default page reload when consent is withdrawn. The
CLI can add it during setup.
