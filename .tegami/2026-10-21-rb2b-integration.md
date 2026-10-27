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

### Add RB2B

`rb2b` from `@c15t/integrations/rb2b` loads RB2B after `marketing` consent.
RB2B has no stop API, so keep the default page reload when consent is
withdrawn. The CLI can generate the integration too.
