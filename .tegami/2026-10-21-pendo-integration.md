---
packages:
  '@c15t/integrations': minor
  '@c15t/cli': patch
  '@c15t/scripts': patch
---

### Add Pendo

`pendo` from `@c15t/integrations/pendo` loads Pendo after `measurement`
consent. When consent is withdrawn it stops Pendo's event sending, and resumes
it with the same visitor if consent returns. The CLI can generate the
integration too.
