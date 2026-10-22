---
packages:
  '@c15t/integrations': minor
  '@c15t/cli': patch
  '@c15t/scripts': patch
---

### Add Vector

`vector` from `@c15t/integrations/vector` loads Vector after `marketing`
consent. Vector has no stop API, so keep the default page reload when consent
is withdrawn. The CLI can generate the integration too.
