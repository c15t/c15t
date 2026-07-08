---
'c15t': patch
---

`getOrCreateConsentRuntime` (the shared runtime behind `ConsentManagerProvider`) now forwards the `headers` option to hosted clients instead of silently dropping it, and includes the headers in the runtime cache key so clients with different headers never share a cached instance.
