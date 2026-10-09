---
packages:
  "@c15t/nextjs": minor
  c15t: minor
---

### Serve Next.js consent routes from one catch-all

`createConsentRoute` serves `/manifest` and `/init` from one App Router route.
Other paths under the prefix return 404, or reach the backend with
`proxy: true`:

```ts
// app/api/c15t/[...c15t]/route.ts
export const { GET } = createConsentRoute(consentConfig);
```

`defineConsentConfig({ routePrefix: '/api/c15t' })` points `manifestURL` and
`initURL` at that route. `backendURL` and `withConsentManifest` now default to
`NEXT_PUBLIC_C15T_BACKEND_URL`.

`withConsentManifest` hands the generated snapshot to `resolveConsent` and the
route handlers, so apps no longer import `c15t-manifest.ts` or keep a
`c15t.server.ts`. `resolveConsent` also accepts a `defineConsentConfig` result
directly, as in `resolveConsent(consentConfig)`.

Pages Router apps can use `createPagesConsentRoute` for
`pages/api/c15t/[...c15t].ts`.
