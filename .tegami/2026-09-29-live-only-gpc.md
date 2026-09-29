---
packages:
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
  "@c15t/dev-tools":
    replay:
      - exit-prerelease(npm:@c15t/dev-tools)
  "@c15t/cli":
    replay:
      - exit-prerelease(npm:@c15t/cli)
  "@c15t/react-native":
    replay:
      - exit-prerelease(npm:@c15t/react-native)
  "@c15t/schema":
    replay:
      - exit-prerelease(npm:@c15t/schema)
  "@c15t/backend":
    replay:
      - exit-prerelease(npm:@c15t/backend)
---

### Read GPC live and stop storing it

**Breaking.** Global Privacy Control works as it did in v2. c15t reads the signal on each load and restricts the categories the policy maps to it while the browser sends it. When the browser stops sending it, the restriction ends. c15t no longer writes the `<key>-privacy` cookie or localStorage entry and no longer sends GPC to the backend.

Clearing c15t data still deletes a `-privacy` value an earlier alpha stored. A leftover value is ignored and doesn't affect the other records.

| Removed | Replacement |
| --- | --- |
| `snapshot.optOutDirectives`, `useOptOutDirectives()` (React, Vue), `optOutDirectives` on the Svelte context | None. Read the live signal with `usePrivacySignals()`. |
| `PrivacyOptOut` type | None |
| `'opt-out-directive'` restriction reason | None. GPC restrictions use `'gpc'`. |
| `recordPrivacyOptOut` on kernel transports, the `privacy:opt-out` event | None |
| `@c15t/schema` privacy directive schemas and types | None |

`@c15t/backend` removes `POST` and `GET /subjects/:id/privacy-directives` and `POST` and `GET /privacy-directives`. `GET /subjects/:id` no longer returns `privacyDirectives`, and `PATCH /subjects/:id` no longer returns `authority`. Migration 3 no longer creates the `privacyDirective` table or adds `subject.identityAuthority`, and migration 5 drops `subject.identityAuthority` where an earlier alpha added it. A database that ran migration 3 under an earlier alpha keeps its `privacyDirective` table and rows. c15t doesn't read them, so you can drop the table by hand.

The Swift and Kotlin cores in `@c15t/react-native` read state stored by earlier alphas and drop the retired fields, so upgrading an install doesn't reset it to deny-all.
