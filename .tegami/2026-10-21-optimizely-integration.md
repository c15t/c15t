---
packages:
  '@c15t/integrations': minor
  '@c15t/scripts': patch
  '@c15t/cli': patch
---

### Add Optimizely Web Experimentation consent integration

`optimizelyWeb()` from `@c15t/integrations/optimizely` loads Optimizely Web Experimentation after `experience` consent. On revocation, c15t removes the snippet and reloads the page. The CLI can add it during setup.
