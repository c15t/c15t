---
packages:
  '@c15t/integrations': minor
  '@c15t/cli': patch
  '@c15t/scripts': patch
---

### Add LiveIntent consent integration

Load LiveIntent's LiveConnect tag after `marketing` consent with `liveIntentTag` from `@c15t/integrations/liveintent`. LiveConnect has no API to stop it, so keep the default page reload when consent is withdrawn. The CLI can now add it during setup.
