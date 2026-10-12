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

### `useNetworkBlocker` holds matching requests from its first render

The standalone `useNetworkBlocker` hook installed its blocker in a mount effect,
so matching `fetch` and XHR requests from earlier effects went out without a
consent check. It now holds them from the first render, like the provider's
`networkBlocker` option, and the blocker decides them once it loads.

Holds are tracked per caller, so the provider option and the hook no longer
release each other's held requests. `createConsentRuntime()` and the Vue plugin
follow the same rules.

Held requests fail as blocked (a 451 response for `fetch`, a failed XHR) if the
hook's component or the provider unmounts before the blocker loads. If React
discards the first render, the hold ends after 10 seconds.

No code changes are needed. Update tests that assert `window.fetch` is
untouched after rendering a component that calls the hook.
