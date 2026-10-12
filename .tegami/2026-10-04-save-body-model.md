---
packages:
  "@c15t/schema":
    replay:
      - exit-prerelease(npm:@c15t/schema)
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/backend":
    replay:
      - exit-prerelease(npm:@c15t/backend)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Send the consent model as `model` on save

The `/subjects` save body names the consent model `model` instead of
`jurisdictionModel`. `@c15t/core` and the native iOS and Android cores send
`model`. The backend still accepts `jurisdictionModel` from 2.x clients, and
`model` wins when both are present. `postSubjectInputSchema` marks
`jurisdictionModel` deprecated.

Deploy this backend with these clients. An older v3 alpha backend ignores
`model`, so saves without a policy decision get records with no model.
