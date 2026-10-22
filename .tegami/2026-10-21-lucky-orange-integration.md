---
packages:
  '@c15t/integrations': minor
  '@c15t/cli': patch
  '@c15t/scripts': patch
---

### Add Lucky Orange

`luckyOrange` from `@c15t/integrations/lucky-orange` loads Lucky Orange after
`measurement` consent and sets its privacy consent status. Turn on Require
Consent in the Lucky Orange dashboard, and keep the default page reload when
consent is withdrawn. The CLI can generate the integration too.
