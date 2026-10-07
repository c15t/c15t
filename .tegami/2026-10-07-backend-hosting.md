---
packages:
  '@c15t/schema': minor
  '@c15t/backend': minor
  '@c15t/core': minor
  '@c15t/browser': minor
  c15t: minor
---

### Report who runs the backend as `window.c15t.hosting`

`/init` and `/manifest` now carry `hosting`: `'inth'` from Inth's hosted
platform, or `'self-hosted'` from any other `@c15t/backend`. The browser exposes
it as `window.c15t.hosting` and on the consent snapshot as `hosting`, separate
from `branding`. It is `null` until `/init` answers, with `offline()`, and with
backends older than this release.

`c15tInstance()` takes a new `hosting` option, defaulting to `'self-hosted'`.
Only Inth's platform should set `'inth'`. Any other value, or `hosting` placed
inside `manifest`, throws when the instance is built.

The value is not signed, so a backend can report either one. Use it for
debugging and support, not as proof of where a site is hosted.

Adding the field changes the manifest `revision`, and with it the `/manifest`
ETag, once after upgrading.
