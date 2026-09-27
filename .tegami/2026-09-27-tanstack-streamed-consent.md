---
packages:
  "@c15t/tanstack-start": minor
---

### Stream the page while consent resolves in TanStack Start

`ConsentRoot`'s `state` now accepts a pending promise, so the root loader can return the consent server function call without awaiting it: `loader: () => ({ consent: getConsentState() })`. TanStack Router streams the promise and the response starts without waiting for the consent backend. The awaited loader holds the whole response until the manifest arrives, which costs the backend's latency on a cold manifest cache and up to the manifest cache's request timeout when the backend stops answering.

With the streamed loader the banner mounts after hydration instead of arriving in the server HTML. No optional category is granted until the state resolves, so gated scripts and embeds stay blocked. The awaited loader keeps working and stays the quickstart default; the quickstart's new "Stream the page while consent resolves" section compares the two.
