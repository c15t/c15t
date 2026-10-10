---
packages:
  '@c15t/tanstack-start': minor
  c15t: minor
---

### TanStack Start: the consent state carries its config

`createConsentStateHandler()` now needs no options. It reads the backend URL
and the policy snapshot from `consentManifest()` in `vite.config.ts`, and the
state it returns carries `backendURL`, `mode` and `routePrefix` to
`ConsentRoot`, which only needs `state`:

```tsx
const getConsentState = createServerFn({ method: 'GET' }).handler(
	createConsentStateHandler()
);

<ConsentRoot state={consent} scripts={scripts}>
```

`createConsentStateHandler({ mode, routePrefix, proxy, snapshot })` takes the
mode as data. `manifest()`, `hosted()` and `offline()` from
`c15t/tanstack-start` are now the data factories from `c15t/modes`, not
transports. `manifest()` (the default) resolves the visitor on the server.
`manifest({ resolve: 'browser' })` leaves it to the browser, and `hosted()`
and `offline()` resolve as their names say. A mode's `snapshot` stays on the
server.

`ConsentRoot` no longer imports the hosted transport. Its first-load
JavaScript holds the record transport only, and the code for init loads
when the browser runs init. The TanStack Start quickstart's first load is
about 500 B (gzip) smaller.

`consentManifest()` from `c15t/tanstack-start/build` serves the snapshot as
`c15t/generated` instead of writing `c15t-manifest.ts`. The browser bundle
gets `snapshot: undefined`. It reads `VITE_C15T_BACKEND_URL`, then
`VITE_INTH_PROJECT_URL`, and a failed download stops `vite build` and warns
in `vite dev`; `onBuildError` and `C15T_ON_BUILD_ERROR` change that.

The browser gets init from `${backendURL}/init` unless the state names a
`routePrefix`, the same option, meaning and default (none) as Next.js. Before,
`ConsentRoot` sent init to `/api/c15t/init` by default, so an app that didn't
mount the consent route got a 404 on every page load. `routePrefix: '/'`
throws when `createConsentStateHandler()` runs: a catch-all route at the site
root would catch every page.

The consent route is `createConsentRoute()` and needs no options either:

```ts
// src/routes/api/c15t/$.ts
export const Route = createFileRoute('/api/c15t/$')({
	server: { handlers: createConsentRoute() },
});
```

With `createConsentRoute({ proxy: true })`, pass
`createConsentStateHandler({ routePrefix: '/api/c15t', proxy: true })` so the
browser saves through the route.

Removed, with no deprecated alias (these were v3 alpha only):

- `ConsentRoot`'s `backendURL` and `routePrefix` props: pass them to
  `createConsentStateHandler()`. A page with no loader passes `state={{}}`
  and gets the backend URL from `consentManifest()`.
- `ConsentRoot`'s `initRoute` prop and the `DEFAULT_INIT_ROUTE` export.
  Replace `initRoute="/api/c15t/init"` with
  `createConsentStateHandler({ routePrefix: '/api/c15t' })`, and drop
  `initRoute={false}`, which is now the default. The server helpers'
  `routePrefix` has no `/api/c15t` default either.
- `createConsentServerRoute`: use `createConsentRoute`, which returns only
  `GET` (plus the write methods with `proxy`). `manifestGET`, `initGET` and
  `proxyHandler` are removed.
- The `manifest` option of `createConsentStateHandler`, `resolveConsent` and
  `createConsentRoute`: use `snapshot`. `manifestURL` on the state handler
  moves to `manifest({ manifestURL })`.
- `ConsentManifestOptions` and `resolveStrictestDefaultInit`: use
  `ResolveConsentOptions` and `resolveUnknownLocationInit`.
- `consentManifest()`'s `outputFile`, `exportName`, `importSource` and
  `rootDir` options, and the generated `c15t-manifest.ts`.

The server render now fetches a relative `backendURL`, such as a backend
mounted elsewhere on the same origin. It skips only URLs under `routePrefix`,
or `/api/c15t` when none is set, so a render never calls its own consent
route.

Changed: a root whose state names no backend URL, and no `consentManifest()`,
throws instead of falling back to offline mode. Pass `mode: offline()` to
resolve without a backend.
