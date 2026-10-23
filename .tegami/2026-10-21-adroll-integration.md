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

### Add AdRoll consent integration

Load AdRoll after `marketing` consent with `adrollPixel` from `@c15t/integrations/adroll`. AdRoll has no API to stop it, so keep the default page reload when consent is withdrawn. The CLI can now add it during setup.
