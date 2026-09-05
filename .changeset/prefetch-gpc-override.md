---
'c15t': patch
'@c15t/nextjs': patch
'@c15t/tanstack-start': patch
---

Let prefetch scripts carry a Global Privacy Control override. `PrefetchOptions.overrides` accepts `gpc`; the inline script sends it as `x-c15t-gpc` and keys its cached promise on it, so a boundary configured with the same override consumes the early `/init` response instead of issuing a second request.
