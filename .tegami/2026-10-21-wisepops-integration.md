---
packages:
  "@c15t/integrations":
    replay:
      - exit-prerelease(npm:@c15t/integrations)
  "@c15t/scripts":
    replay:
      - exit-prerelease(npm:@c15t/scripts)
  "@c15t/cli":
    replay:
      - exit-prerelease(npm:@c15t/cli)
---

### Add Wisepops consent integration

`wisepops()` from `@c15t/integrations/wisepops` loads Wisepops after `marketing` consent. Wisepops can't revoke consent from code, so c15t reloads the page on revocation. The CLI can add it during setup.
