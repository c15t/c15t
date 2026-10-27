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

### Add Pendo

`pendo` from `@c15t/integrations/pendo` loads Pendo after `measurement`
consent. When consent is withdrawn it stops Pendo's event sending, and resumes
it with the same visitor if consent returns. The CLI can generate the
integration too.
