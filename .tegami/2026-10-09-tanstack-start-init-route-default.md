---
packages:
  '@c15t/tanstack-start': minor
  '@c15t/cli': patch
  c15t: minor
---

### TanStack Start uses `routePrefix` for the consent route, like Next.js

`ConsentRoot` no longer sends init to `/api/c15t/init` unless you ask it to.
By default the browser requests `${backendURL}/init`, so the quickstart works
without a consent server route. Before, an app that didn't mount the route got
a 404 on every page load.

To resolve init on your own origin, mount `createConsentServerRoute()` at
`src/routes/api/c15t/$.ts` and pass its prefix as `routePrefix`, the option
Next.js `defineConsentConfig` takes, with the same meaning and no default:

```tsx
<ConsentRoot state={consent} backendURL={backendURL} routePrefix="/api/c15t">
```

The browser then requests `/api/c15t/init`, and each save is bound to the
policy the route resolved. Pass the same `routePrefix` to
`createConsentStateHandler` or `resolveConsent`. With the proxy
(`createConsentServerRoute({ proxy: true })`), also pass
`backendURL="/api/c15t"`. A `consentPrefetchHead()` script for such a root
uses the prefix as its `backendURL`.

`routePrefix` on the server helpers no longer defaults to `/api/c15t`. They
still never fetch a relative `backendURL` during the render.

Breaking for earlier v3 alphas: the `initRoute` prop and the
`DEFAULT_INIT_ROUTE` export are removed. Replace `initRoute="/api/c15t/init"`
with `routePrefix="/api/c15t"`, and drop `initRoute={false}`, which is now the
default.

The CLI's TanStack Start template no longer writes `initRoute={false}`.
