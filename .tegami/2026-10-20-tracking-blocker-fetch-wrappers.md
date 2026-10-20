---
packages:
  c15t: patch
---

### Keep the tracking blocker working with wrapped `fetch`

The tracking blocker threw when the page's `fetch` came from another library
that exposes a property through a getter, so the consent store failed to start.
It now copies the original `fetch`'s properties before wrapping it.
