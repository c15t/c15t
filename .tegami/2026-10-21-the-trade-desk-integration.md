---
packages:
  '@c15t/integrations': minor
  '@c15t/cli': patch
  '@c15t/scripts': patch
---

### Add The Trade Desk consent integration

Load The Trade Desk Universal Pixel after `marketing` consent with `theTradeDeskPixel` from `@c15t/integrations/the-trade-desk`. The Trade Desk has no API to stop its SDK, so keep the default page reload when consent is withdrawn. The CLI can now add it during setup.
