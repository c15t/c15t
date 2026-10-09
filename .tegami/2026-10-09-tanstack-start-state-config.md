---
packages:
  '@c15t/tanstack-start': minor
  '@c15t/core': minor
  '@c15t/cli': patch
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

`createConsentStateHandler({ mode, routePrefix, snapshot })` takes the mode
as data. `manifest()`, `hosted()` and `offline()` from `c15t/tanstack-start`
are now the data factories from `@c15t/core/modes`, not transports.
`manifest()` (the default) resolves the visitor on the server.
`manifest({ resolve: 'browser' })` leaves it to the browser, and `hosted()`
and `offline()` resolve as their names say. A mode's `snapshot` stays on the
server.

`ConsentRoot` no longer imports the hosted transport. Its first-load
JavaScript holds the record transport only, and the code for init loads
when the browser runs init. The TanStack Start quickstart's first load is
about 500 B (gzip) smaller.

The browser gets init from `${backendURL}/init` unless the state names a
`routePrefix`, the same option, meaning and default (none) as Next.js. Before,
`ConsentRoot` sent init to `/api/c15t/init` by default, so an app that didn't
mount the consent route got a 404 on every page load.

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

Breaking for earlier v3 alphas:

- `ConsentRoot` drops the `backendURL` and `routePrefix` props. Pass them to
  `createConsentStateHandler()`; a page with no loader passes `state={{}}`
  and gets the backend URL from `consentManifest()`.
- `createConsentServerRoute` is renamed `createConsentRoute`, and returns
  only `GET` (plus the write methods with `proxy`). `manifestGET`, `initGET`
  and `proxyHandler` are removed.
- `manifest` is renamed `snapshot` on `createConsentStateHandler`,
  `resolveConsent` and `createConsentRoute`. `manifestURL` on the state
  handler moves to `manifest({ manifestURL })`.
- `ConsentManifestOptions` and `resolveStrictestDefaultInit` are removed.
- `ConsentRoot`'s `initRoute` prop and the `DEFAULT_INIT_ROUTE` export are
  removed. Replace `initRoute="/api/c15t/init"` with
  `createConsentStateHandler({ routePrefix: '/api/c15t' })`, and drop
  `initRoute={false}`, which is now the default. The server helpers'
  `routePrefix` has no `/api/c15t` default either.
- A root whose state names no backend URL, and no `consentManifest()`,
  throws instead of falling back to offline mode. Pass `mode: offline()` to
  resolve without a backend.

`clientMode()` from `@c15t/core/runtime/client-mode` takes `initialData`, an
init response a prefetch script already requested, and builds its lazy
hosted and browser-resolver chunks self-contained, so Vite 8 doesn't split
a page's first-load chunk around them.
