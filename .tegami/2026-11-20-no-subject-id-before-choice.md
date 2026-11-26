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

### Stop storing `c15t-sid` before a choice

c15t no longer writes the `c15t-sid` cookie or localStorage key on first load.
The subject ID is stored with the visitor's first saved record, and a leftover
`c15t-sid` is removed on start. `identify()` before the first save is sent
with that save.

`resolveRequestSubject()` is deprecated, returns `null` without a saved
consent record cookie, and no longer returns a cookie to set. Each adapter's
`subjectCookie` option (along with the cookie-writing `storage` and
`trustForwardedHeaders` middleware options) does nothing. v4 removes them.

If your cookie policy lists `c15t-sid`, remove it.
