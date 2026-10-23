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

### Add Marketo Munchkin integration

`marketoMunchkin` from `@c15t/integrations/marketo` loads Adobe Marketo Munchkin after `marketing` consent. Munchkin has no API to stop tracking, so withdrawing consent reloads the page.
