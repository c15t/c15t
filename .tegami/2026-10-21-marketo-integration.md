---
packages:
  '@c15t/integrations': minor
  '@c15t/cli': patch
  '@c15t/scripts': patch
---

### Add Marketo Munchkin integration

`marketoMunchkin` from `@c15t/integrations/marketo` loads Adobe Marketo Munchkin after `marketing` consent. Munchkin has no API to stop tracking, so withdrawing consent reloads the page.
