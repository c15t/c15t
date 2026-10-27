---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/backend":
    replay:
      - exit-prerelease(npm:@c15t/backend)
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
---

### Give every visitor a subject ID from the first page load

A browser runtime now has `snapshot.subject.subjectId` from the first
snapshot, before the visitor decides anything. Before, the ID appeared only
at the first save. You can link activity to a visitor from the first page
load and still find it when they opt out.

- Persistence stores the ID in a new `<storageKey>-sid` cookie and
  localStorage key (`c15t-sid` by default). The first save records the same
  ID with the choice.
- The ID alone is not a choice. The banner still shows and `hasConsented()`
  stays `false` until the visitor decides.
- `clear()`, a revocation and `clearOnRevocation` patterns keep the ID.
  `kernel.set.subjectId(null)` starts over with a new one.
- An ID a tab generated, or read from `c15t-sid` alone, follows one another
  tab stores until this tab saves or identifies the visitor. IDs the app or
  the server supplies, IDs the stored records carry when the page loads, and
  a new ID `set.subjectId(null)` writes into existing records do not follow.
  `subject:resolved` now carries `previousSubjectId`, the ID it replaced, so
  you can move anything recorded under the old one.
- With `persistence: false`, the ID lives in memory and each page load gets a
  new one.

`identify()` works before the first save. `PATCH /subjects/:id` in
`@c15t/backend` now creates the subject and links the identity in one request
when no save has created the subject yet. Before, the link needed a save
first. Like `POST /subjects`, it needs no API key. The backend has no rate or
body-size limit of its own, so set them in front of it; see the self-host
configuration guide. The client treats a `404` from an older self-hosted
backend as success and sends the identity with the next save.
