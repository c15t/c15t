---
packages:
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
---

### Astro server renders no longer wait on a slow or unreachable consent backend

The Astro middleware resolves consent before the page renders. In hosted mode it
called the backend's `/init` with no time limit, so a backend that never
answered held every server-rendered page open. In manifest mode a cold cache
waited for the manifest request's 10 second timeout. The middleware now waits at
most 500 ms. When that runs out the page renders without the server decision:
no banner in the HTML, optional categories denied, and consent-gated scripts and
iframes blocked. The browser then resolves the policy and shows the banner. A
manifest request keeps running, fills the cache for the next render, and is
handed to the adapter's `waitUntil` when there is one.

Set the budget with `middleware: { timeoutMs }` in the integration options, or
`timeoutMs` when calling `resolveConsentContext` yourself. `timeoutMs: false`
waits for the backend as before. `DEFAULT_RESOLVE_TIMEOUT_MS` is exported from
`@c15t/astro/server`.

#### Migration

Sites whose backend takes longer than 500 ms to answer `/init` now get the
banner after the page loads instead of in the server HTML. Raise
`middleware.timeoutMs` above the backend's usual response time, or set it to
`false` to keep the old behavior.
