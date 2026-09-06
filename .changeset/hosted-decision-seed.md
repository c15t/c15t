---
'c15t': patch
'@c15t/tanstack-start': patch
---

`hosted()` accepts `decisionInputs` so a transport can start with the policy decision a server-side prefetch already resolved. `ConsentBoundary` seeds it from the prefetched config, so a consent choice made before the client `init()` resolves still asserts the policy ID and fingerprint on `POST /subjects`.
