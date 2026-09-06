---
'@c15t/core': minor
---

`hosted()` accepts `initURL` and `assertDecisionInputs`. `initURL` points `GET /init` at a different route, such as a same-origin Next.js handler that resolves init from the cached manifest with the request's geo headers, while consent saves keep posting to `${url}/subjects`. `assertDecisionInputs` sends the resolved policy id, fingerprint, geo, and language with those saves so the backend can reject a consent recorded against a stale policy.
