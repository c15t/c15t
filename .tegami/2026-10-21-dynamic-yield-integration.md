---
packages:
  '@c15t/integrations': minor
  '@c15t/scripts': patch
  '@c15t/cli': patch
---

### Add Dynamic Yield consent integration

`dynamicYield()` loads Dynamic Yield only after `experience` consent. Includes configuration and revocation guidance, loader contract tests, and CLI setup support.

Loader sharing is scoped to the section and region. Independent registrations with different sections or regions request their configured dynamic and static scripts instead of adopting another section's loaders.
