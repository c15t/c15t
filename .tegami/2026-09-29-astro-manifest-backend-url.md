---
packages:
  '@c15t/astro': patch
---

### Require a backend URL in Astro manifest mode

`manifest()` without a `backendURL` now fails when `astro.config` loads, with an error that says where to set one. Before, only a `manifestURL` without a `backendURL` was caught. A bare `manifest()` built, then the browser posted every save to `/api/c15t/subjects`, where nothing answers, so consent was never recorded.

`C15T_BACKEND_URL` or `PUBLIC_C15T_BACKEND_URL`, when set as `astro.config` loads, still counts. Its value is now passed to the browser as well, so saves go to that backend. An inline `manifest` without a `backendURL` still builds.
