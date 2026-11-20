---
packages:
  c15t: minor
  '@c15t/core': minor
  '@c15t/browser': minor
  '@c15t/nextjs': minor
  '@c15t/tanstack-start': minor
  '@c15t/astro': minor
  '@c15t/svelte': minor
  '@c15t/vue': minor
---

### Drop the unused `c15t-sid` cookie

c15t 3.2 stored a subject ID in a `c15t-sid` cookie and localStorage key on
the first page load, before the visitor chose anything. Nothing used it
before a save, so the ID now lives in memory until the first save stores it
with the record. A reload before that starts with a new ID.

- On start, c15t removes a `c15t-sid` an earlier version left.
- The framework adapters no longer set the cookie. A server render reads
  the ID from the record cookies.
- `identify()` before the first save sends the identity with that save
  instead of `PATCH /subjects/:id`.
- `resolveRequestSubject()` is deprecated and never returns a cookie to
  set. Each adapter's `subjectCookie` option does nothing. Both are removed
  in v4.

If your cookie policy lists `c15t-sid`, remove it.
