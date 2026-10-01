---
packages:
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
---

### Stop exposing the kernel on `window.c15tKernel`

`ConsentProvider` no longer sets `window.c15tKernel`. Nothing in c15t has read it since DevTools started taking the kernel directly, and the global kept the whole kernel reachable from any script on the page, including after the provider unmounted. `window.c15t` still carries the debug information. Pages that use the React provider ship 54 bytes less JavaScript after gzip.
