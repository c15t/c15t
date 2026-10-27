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

### Add Appcues consent integration

`appcues()` from `@c15t/integrations/appcues` loads Appcues after `experience` consent. Use `onReady` to identify the visitor once the SDK loads. On revocation it calls `Appcues.reset()` and c15t reloads the page. The CLI can add it during setup.
