---
packages:
  '@c15t/core': minor
  c15t: minor
  '@c15t/react': minor
  '@c15t/nextjs': patch
  '@c15t/tanstack-start': patch
  '@c15t/vue': patch
  '@c15t/svelte': patch
  '@c15t/astro': patch
  '@c15t/browser': patch
---

### Keep open tabs in step with stored consent

A choice saved in one tab now reaches every other open tab of the site. Before,
a tab kept a grant after another tab stored a denial, and neither
`kernel.refresh()` nor `runtime.reinit()` read storage again.

Browser persistence reads stored records again when another tab changes a c15t
localStorage key, when the page becomes visible and when the window regains
focus. A stored record replaces the one in memory unless it is older. A record
removed from storage is cleared, so the active policy decides again. Blocked
storage or bytes that do not decode change nothing. Reconnecting does not read
storage.

Queued writes follow the same ordering. A tab lands its own pending write
before it reads, a write never replaces a newer stored record, and the rewrite
that adds a server subject id no longer recreates records another tab cleared.

New API:

- `runtime.reconcileStorage()` and `persistence.reconcile()` read stored
  records on demand and return whether anything changed. React's
  `usePersistence()` handle has `reconcile()` too.
- `persistence: { sync: false }` keeps storage but turns off the automatic
  reads. `dispose()` removes the listeners.

See [keep open tabs in step](https://c15t.com/docs/guides/consent-state#keep-open-tabs-in-step).
