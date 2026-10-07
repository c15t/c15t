---
packages:
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
---

### Stop a slow or unreachable backend from holding SvelteKit pages

`loadConsent` from `@c15t/svelte/kit` waits at most `timeoutMs` (500 ms by
default) for the init route or the backend `/init`. Before, a slow or hung
backend held every page until it answered or timed out.

When the budget runs out, the page renders without consent UI in the server
HTML, optional categories stay denied, and the browser shows the banner after
hydration.

#### Migration

- Pages whose backend takes longer than 500 ms render the banner after hydration
  on that request. Raise the budget with
  `loadConsent(event, { backendURL, timeoutMs: 1500 })`, or pass
  `timeoutMs: false` to wait as before.
