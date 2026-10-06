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

The `/subjects` save body names the consent model `model`, the same name the rest of the v3 API uses. It was `jurisdictionModel`, the last v2 jurisdiction name on the v3 wire.

- `@c15t/core` and the native iOS and Android cores send `model`.
- The backend reads `model` and still accepts `jurisdictionModel` from 2.x clients. When a save carries both, `model` wins.
- `postSubjectInputSchema` adds `model` and marks `jurisdictionModel` deprecated.

The backend only reads this field when a save has no policy decision. Deploy this backend with these clients: an older v3 alpha backend ignores `model`, so its consent records for such saves have no model.
