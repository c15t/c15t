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
  '@c15t/iab': patch
---

### Keep open tabs in step with stored consent

A choice saved in one tab now reaches the other open tabs on the same origin
without a reload. Before, a tab kept a grant after another tab stored a denial,
and neither `kernel.refresh()` nor `runtime.reinit()` read storage again.

Browser persistence reads stored records again when another tab on the same
origin changes a c15t localStorage key, when the page becomes visible and when
the window regains focus. A tab on another subdomain that shares the consent
cookie gets no `storage` event and catches up on its next focus or visibility
change, and so does every tab when localStorage is unavailable and only the
cookie is stored. Category decisions merge per category, keeping the newer decision for
each, and privacy directives merge as a union. A stored notice or vendor record
replaces the one in memory unless it is older. A record removed from storage is
cleared, so the active policy decides again. Blocked storage or bytes that do
not decode change nothing. Reconnecting does not read storage.

Queued writes follow the same rules. A tab lands its own pending write before it
reads, a choice write stores the per-category merge with what storage holds, a
directive write keeps every stored directive, and the rewrite that adds a
server subject id no longer recreates records another tab cleared. When two
tabs act in the same millisecond, the record stored first wins in both. A
tab that opened before another stored a subject joins the stored subject
unless it identified a different user; a subject id the server resolved is
kept unless a strictly newer stored choice carries another one. Only a
record this tab saw in storage is cleared when it disappears, so a choice
seeded while storage was blocked survives storage becoming readable.

Under an IAB policy, `@c15t/iab` loads the TC string another tab stored once
its choice is reconciled, with its purpose, vendor and special-feature
selections, so `__tcfapi` and the preference controls no longer show the
previous choice. Selections changed in this tab without saving are kept. A
TC string that grants any purpose of a category denied after it was saved
is withdrawn and not restored on the next page load; a partial purpose
selection saved through IAB keeps its TC string.

Clearing records now stores the clear epoch, the time of the clear, under
`c15t-epoch` in localStorage and a cookie of the same name, and clearing never
removes it. Every consent record written afterwards records its epoch too.
Decisions confirmed before the epoch are void everywhere: a tab that reconciles
after another tab cleared and saved again drops its pre-clear decisions, a tab
that missed the clear cannot write them back, and browser hydration and server
reads (`readStoredRecordsFromCookieHeader`) ignore them. Records from before any
clear, including v2 and legacy records, read as epoch 0 and are unaffected.

This changes the stored format: after a clear, the consent cookie gains
`&e=<time>` (16 bytes) and the localStorage record an `epoch` field (22 bytes).
Visitors who never cleared store what they did before. Older c15t builds reject
a consent cookie that carries the epoch and treat the visitor as undecided.

New API:

- `runtime.reconcileStorage()` and `persistence.reconcile()` read stored
  records on demand and return whether anything changed. React's
  `usePersistence()` handle has `reconcile()` too.
- `persistence: { sync: false }` keeps storage but turns off the automatic
  reads. `dispose()` removes the listeners.

See [keep open tabs in step](https://c15t.com/docs/guides/consent-state#keep-open-tabs-in-step).
