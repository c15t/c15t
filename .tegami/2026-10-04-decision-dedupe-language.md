---
packages:
  "@c15t/backend":
    replay:
      - exit-prerelease(npm:@c15t/backend)
---

### Record one decision per visit whichever way the save arrives

A save with a policy snapshot token keyed its decision on the raw
`Accept-Language` header, and a save without one keyed it on the served
language, so one visit could record two decisions. Both paths now key on the
served language, carried in a new `servedLanguage` token claim.

The dedupe key is hashed for every deployment, so it always fits MySQL's indexed
`varchar(255)`. After upgrading from 2.x, each decision is recorded once more,
then deduplicated as before.
