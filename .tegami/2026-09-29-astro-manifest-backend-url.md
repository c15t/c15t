---
packages:
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
---

### Require a backend URL in Astro manifest mode

`manifest()` without a `backendURL` fails when `astro.config` loads. Before, it
built, and the browser posted every save to `/api/c15t/subjects`, where nothing
answers, so consent was never recorded. `C15T_BACKEND_URL` or
`PUBLIC_C15T_BACKEND_URL` still counts and is passed to the browser too. An
inline `manifest` without a `backendURL` still builds.

`backendURL: ''` counts as set and posts saves to `/subjects` on the site's own
origin. Pair it with a `manifestURL`, an inline `manifest` or
`C15T_MANIFEST_URL`, or `astro.config` fails to load.
