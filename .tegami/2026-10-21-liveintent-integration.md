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

### Add LiveIntent consent integration

Load LiveIntent's LiveConnect tag after `marketing` consent with `liveIntentTag` from `@c15t/integrations/liveintent`. LiveConnect has no API to stop it, so keep the default page reload when consent is withdrawn. The CLI can now add it during setup.
