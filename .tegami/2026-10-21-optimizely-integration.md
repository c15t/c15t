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

### Add Optimizely Web Experimentation consent integration

`optimizelyWeb()` from `@c15t/integrations/optimizely` loads Optimizely Web Experimentation after `experience` consent. On revocation, c15t removes the snippet and reloads the page. The CLI can add it during setup.
