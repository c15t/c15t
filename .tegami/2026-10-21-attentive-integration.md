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

### Add Attentive integration

`attentiveTag` from `@c15t/integrations/attentive` loads the Attentive tag after `marketing` consent. Attentive cannot be stopped once it runs, so withdrawing consent reloads the page.
