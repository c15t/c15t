---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
  "@c15t/iab":
    replay:
      - exit-prerelease(npm:@c15t/iab)
---

### Keep open tabs in step with stored consent

A choice saved in one tab reaches the other open tabs on the same origin
without a reload. Tabs read stored records again when another tab changes a
c15t localStorage key, when the page becomes visible and when the window
regains focus. Tabs on a sibling subdomain that share the consent cookie catch
up on focus or visibility change. Decisions merge per category, keeping the
newer one. Under an IAB policy, `@c15t/iab` loads the TC string another tab
stored, so `__tcfapi` and the preference controls stop showing the old choice.

Clearing records stores a clear epoch under `c15t-epoch` in localStorage and a
cookie of the same name. Decisions confirmed before the epoch are ignored
everywhere, including in `readStoredRecordsFromCookieHeader`.

After a clear, the consent cookie gains `&e=<time>` and the localStorage record
an `epoch` field. Older c15t builds reject these records and treat the visitor
as undecided, so under an opt-out policy they grant optional categories until a
new choice is saved. Deploy the new build to every page of the site before
visitors can clear their records.

New API:

- `runtime.reconcileStorage()` and `persistence.reconcile()` read stored
  records on demand and return whether anything changed. React's
  `usePersistence()` handle has `reconcile()` too.
- `persistence: { sync: false }` keeps storage but turns off the automatic
  reads. `dispose()` removes the listeners.

See [keep open tabs in step](https://c15t.com/docs/guides/consent-state#keep-open-tabs-in-step).
