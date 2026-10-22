---
packages:
  '@c15t/integrations': minor
  '@c15t/scripts': patch
  '@c15t/cli': patch
---

### Add Wisepops consent integration

`wisepops()` from `@c15t/integrations/wisepops` loads Wisepops after `marketing` consent. Wisepops can't revoke consent from code, so c15t reloads the page on revocation. The CLI can add it during setup.
