---
packages:
  '@c15t/schema': minor
  '@c15t/backend': minor
  '@c15t/core': minor
  '@c15t/browser': minor
  c15t: minor
---

### Report who runs the backend as `window.c15t.hosting`

`c15tInstance()` takes a `hosting` option, `'self-hosted'` by default or `'inth'` on Inth's platform. `/init` and `/manifest` report it, and the browser exposes it as `window.c15t.hosting` and the snapshot's `hosting`. It is not signed, so treat it as a debugging signal.
