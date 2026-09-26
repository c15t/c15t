---
packages:
  c15t: patch
  "@c15t/core": patch
  "@c15t/react": patch
  "@c15t/vue": patch
---

### Block network requests sent before the network blocker loads

The network blocker loaded after mount, so a `fetch` or XHR that matched a rule and was sent from a child component's mount effect, from an effect next to the provider, or from a client module evaluated inside it went out without a consent check. This happened on first visits, for visitors who had rejected, and when the policy request failed or hung. `ConsentProvider` and `ConsentRoot` now hold matching requests from their first render in the browser, and the blocker decides them once it loads. Vue holds them from plugin install until the root mounts. `createConsentRuntime()`, which `@c15t/svelte` and the `c15t` browser client use, holds them from construction until `start()`.

While consent is unknown, a matching request that would be blocked now waits instead of failing. It is sent if the resolved policy and the visitor's stored choice allow it, and blocked if they do not or if the policy fails to load. Requests that match no rule are not delayed. Apps without `networkBlocker` still do not download the blocker; the hold adds about 0.8 KB gzip to first-load JavaScript.

Requests made before the provider renders are still out of reach, including inline scripts, tags loaded before hydration, and client modules that webpack evaluates when a route's chunk loads. The new network blocker pages for Next.js and React describe these limits and how to keep tracking calls out of that window.
