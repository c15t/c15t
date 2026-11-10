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

### Add Capless analytics integration

`caplessAnalytics` from `@c15t/integrations/capless-analytics` loads Capless
analytics and session replay after `measurement` consent. Capless cannot stop a
running replay, so keep the default page reload when consent is withdrawn. The
CLI can add it during setup.
