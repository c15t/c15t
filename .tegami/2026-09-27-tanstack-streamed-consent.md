---
packages:
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
---

### Stream the page while consent resolves in TanStack Start

`ConsentRoot`'s `state` accepts a pending promise, so the root loader can return
the consent server function call without awaiting it, as in
`loader: () => ({ consent: getConsentState() })`. The response then streams
instead of waiting for the consent backend.

With a streamed loader the banner mounts after hydration instead of arriving in
the server HTML, and no optional category is granted until the state resolves.
The awaited loader still works and stays the quickstart default.
