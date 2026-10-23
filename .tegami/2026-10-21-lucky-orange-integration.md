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

### Add Lucky Orange

`luckyOrange` from `@c15t/integrations/lucky-orange` loads Lucky Orange after
`measurement` consent and sets its privacy consent status. Turn on Require
Consent in the Lucky Orange dashboard, and keep the default page reload when
consent is withdrawn. The CLI can generate the integration too.
