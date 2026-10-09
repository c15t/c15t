---
packages:
  '@c15t/tanstack-start': minor
  '@c15t/cli': patch
  c15t: minor
---

### Call the backend's /init by default in TanStack Start

`ConsentRoot` no longer sends init to `/api/c15t/init` unless you ask it to.
With an absolute `backendURL`, the browser now requests
`${backendURL}/init`, so the quickstart works without
`initRoute={false}` and without a consent server route. Before, an app that
left out `initRoute` and didn't mount the route got a 404 on every page load.

A same-origin `backendURL` such as `"/api/c15t"`, used with
`createConsentServerRoute({ proxy: true })`, still sends init through the
route and binds each save to the policy it resolved. `initRoute={false}`
still works and now matches the default for an absolute `backendURL`.

If you mount `createConsentServerRoute()` and pass the absolute backend URL
to `ConsentRoot`, add `initRoute="/api/c15t/init"` (or `DEFAULT_INIT_ROUTE`)
to keep init on your origin. The same applies if a `consentPrefetchHead()`
script points at `/api/c15t`.

The CLI's TanStack Start template no longer writes `initRoute={false}`.
