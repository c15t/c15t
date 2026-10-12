---
packages:
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
---

### Forward consent saves through the SvelteKit consent route

`createSvelteKitConsentRouteHandlers` answered only `GET`, so a provider using
`hosted({ url: '/api/c15t' })` got `405` on every save. Pass `proxy: true` to
add `POST`, `PATCH`, `PUT`, `DELETE` and `OPTIONS`, which forward to
`backendURL`, and export all six from the catch-all route:

```ts
// src/routes/api/c15t/[...path]/+server.ts
export const { GET, POST, PATCH, PUT, DELETE, OPTIONS } =
	createSvelteKitConsentRouteHandlers({ backendURL, proxy: true });
```

The proxy follows the same rules as `createConsentServerRoute({ proxy })` in
`@c15t/tanstack-start`. It forwards only c15t's own paths and any `paths` you
add, answers `404` for anything else, and forwards cookies only when
`cookieNames` names them. Both proxies answer `504` when the backend times out
and `502` when it cannot be reached. The shared helpers, such as
`forwardConsentRequest`, are exported from `@c15t/core/server`.

A relative `backendURL` or `manifestURL` is fetched through `event.fetch`.
Before, on adapter-node without `ORIGIN`, a forged `Host` header could send
these requests to another host. The `fetch` option applies to absolute URLs
only.

To a remote `http:` backend, the proxy no longer sends cookies, custom headers
or `x-forwarded-for`, so the backend cannot use the visitor's IP address for
geolocation or rate limiting. Use an `https:` backend URL to keep them. Loopback
backends still get all three.
