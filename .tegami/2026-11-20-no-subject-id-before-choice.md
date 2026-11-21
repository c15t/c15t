---
packages:
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
---

### Stop storing `c15t-sid` before a choice

c15t no longer writes the `c15t-sid` cookie or localStorage key on first load.
The subject ID is stored with the visitor's first saved record, and a leftover
`c15t-sid` is removed on start. `identify()` before the first save is sent
with that save.

`resolveRequestSubject()` is deprecated and no longer returns a cookie to set.
Each adapter's `subjectCookie` option does nothing. v4 removes both.

If your cookie policy lists `c15t-sid`, remove it.
