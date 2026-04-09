---
"@c15t/backend": patch
---

Mark the edge runtime callables as unstable in `2.0`.

- rename `c15tEdgeInit()` to `unstable_c15tEdgeInit()`
- rename `resolveConsent()` to `unstable_resolveConsent()`
- update the edge docs and source examples to use the `unstable_` exports
