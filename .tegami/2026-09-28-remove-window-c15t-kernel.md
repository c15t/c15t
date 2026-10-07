---
packages:
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
---

### Stop exposing the kernel on `window.c15tKernel`

`ConsentProvider` no longer sets `window.c15tKernel`. Nothing in c15t read it,
and it kept the whole kernel reachable from any script on the page, even after
the provider unmounted. `window.c15t` still carries the debug information.
