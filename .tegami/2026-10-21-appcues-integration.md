---
packages:
  '@c15t/integrations': minor
  '@c15t/cli': patch
  '@c15t/scripts': patch
---

### Add Appcues consent integration

`appcues()` from `@c15t/integrations/appcues` loads Appcues after `experience` consent. Use `onReady` to identify the visitor once the SDK loads. On revocation it calls `Appcues.reset()` and c15t reloads the page. The CLI can add it during setup.
