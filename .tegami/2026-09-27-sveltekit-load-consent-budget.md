---
packages:
  '@c15t/svelte': patch
---

### Stop a slow or unreachable backend from holding SvelteKit pages

`loadConsent` from `@c15t/svelte/kit` now waits at most `timeoutMs` (500 ms by
default) for the init route or the backend `/init`. Before, the documented
awaited `+layout.server.ts` held every page until the backend answered: with
`backendURL`, a backend that accepted the connection and never replied kept
the page from sending a byte until Node's own fetch timeout, and with
`initRoute`, a cold manifest cache held it for the manifest cache's 10 second
timeout.

When the budget runs out, `loadConsent` returns the stored choice and request
context without a policy, as it already did when the call failed. The page
renders without consent UI in the server HTML, optional categories stay
denied, and the browser resolves the policy and shows the banner after
hydration. A hosted `/init` request is aborted. An init route request keeps
running and fills the manifest cache for the next render.

#### Migration

- Pages whose backend takes longer than 500 ms now render the banner after
  hydration on that request instead of in the server HTML. Raise the budget
  with `loadConsent(event, { backendURL, timeoutMs: 1500 })`, or pass
  `timeoutMs: false` to wait as before.
