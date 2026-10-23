---
packages:
  '@c15t/integrations': minor
  '@c15t/cli': patch
  '@c15t/scripts': patch
---

### Add RB2B

`rb2b` from `@c15t/integrations/rb2b` loads RB2B after `marketing` consent.
RB2B has no stop API, so keep the default page reload when consent is
withdrawn. The CLI can generate the integration too.
