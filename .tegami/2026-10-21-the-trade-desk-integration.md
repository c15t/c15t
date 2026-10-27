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

### Add The Trade Desk consent integration

Load The Trade Desk Universal Pixel after `marketing` consent with `theTradeDeskPixel` from `@c15t/integrations/the-trade-desk`. The Trade Desk has no API to stop its SDK, so keep the default page reload when consent is withdrawn. The CLI can now add it during setup.
