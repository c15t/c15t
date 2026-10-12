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
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
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

### Read GPC live instead of storing standing opt-outs

Breaking. Global Privacy Control works as it did in v2. c15t reads the signal on
each load and restricts the categories the policy maps to it only while the
browser sends it. c15t no longer writes the `<key>-privacy` cookie or
localStorage entry, and the backend no longer records GPC opt-outs.

| Removed | Replacement |
| --- | --- |
| `snapshot.optOutDirectives`, `useOptOutDirectives()` (React, Vue, TanStack Start), `optOutDirectives` on the Svelte context | None. Read the live signal with `usePrivacySignals()`. |
| `PrivacyOptOut` type | None |
| `'opt-out-directive'` restriction reason | None. GPC restrictions use `'gpc'`. |
| `recordPrivacyOptOut` on kernel transports, the `privacy:opt-out` event | None |
| `@c15t/schema` privacy directive schemas and types | None |

`@c15t/backend` removes the `/subjects/:id/privacy-directives` and
`/privacy-directives` endpoints, `privacyDirectives` from `GET /subjects/:id`
and `authority` from `PATCH /subjects/:id`. Migration 5 drops
`subject.identityAuthority` where an earlier alpha added it. A database that ran
migration 3 under an earlier alpha keeps its `privacyDirective` table, which
c15t no longer reads, so you can drop it by hand.
