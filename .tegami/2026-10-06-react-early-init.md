---
packages:
  "@c15t/react": patch
  "@c15t/core": patch
  c15t: patch
---

### `ConsentProvider` requests `/init` while it first renders

In the browser, a `ConsentProvider` with `hosted()` and no `prefetch` now sends its `GET /init` request while it first renders, as v2 did, instead of from its mount effect. On a client-rendered page that is before the first paint rather than after it. In a React + Vite quickstart with a 200 ms backend, the banner shows about 38 ms sooner on a throttled mobile profile (4× CPU, 170 ms round trips) and about 10 ms sooner unthrottled. A returning visitor's consented scripts start about 42 ms sooner on mobile. Hydration and first paint do not change.

The answer still applies when the provider mounts. If `overrides`, the language or `user` change before then, the provider sends a new request with them. StrictMode's repeated render and a render that suspends before its first commit share one request, even when they call `hosted()` again with the same options. Two providers on one page each send their own. Server renders, a `prefetch` or `ConsentRoot` state, `consentSource`, `enabled: false`, an `experiment`, custom transports and factories that wrap `hosted()` keep the previous timing.

The hosted transport now calls `fetch` within `init()` when nothing was prefetched, rather than one microtask later.
