---
packages:
  '@c15t/integrations': minor
  '@c15t/cli': patch
  '@c15t/scripts': patch
---

### Add AdRoll consent integration

Load AdRoll after `marketing` consent with `adrollPixel` from `@c15t/integrations/adroll`. AdRoll has no API to stop it, so keep the default page reload when consent is withdrawn. The CLI can now add it during setup.
