---
packages:
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
---

### Block network requests sent before the network blocker loads

A `fetch` or XHR matching a `networkBlocker` rule that was sent during mount,
before the blocker loaded, went out without a consent check. `ConsentProvider`
and `ConsentRoot` hold matching requests from their first browser render, Vue
from plugin install, and `createConsentRuntime()` (used by `@c15t/svelte` and
the `c15t` browser client) from construction. The blocker decides them once it
loads. While consent is unknown they wait instead of failing. Requests that
match no rule are not delayed. If the provider unmounts or the runtime is
disposed first, held requests are answered as blocked (a 451 response for
`fetch`, a failed XHR).

Requests made before the provider renders, such as inline scripts and tags
loaded before hydration, are still out of reach. The network blocker pages for
Next.js and React describe these limits.
