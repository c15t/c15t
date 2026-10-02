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

`createSvelteKitConsentRouteHandlers` answered `GET` only, so a provider
using `hosted({ url: '/api/c15t' })` got `405` on every save. Pass
`proxy: true` and the handlers add `POST`, `PATCH`, `PUT`, `DELETE` and
`OPTIONS`, which forward to `backendURL`. `GET` forwards paths other than
`init` and `manifest`, which are still resolved in-process. Only those
exact rest paths stay local, so a `paths` entry such as `reports/manifest`
is forwarded. Export all six from the catch-all route:

```ts
// src/routes/api/c15t/[...path]/+server.ts
export const { GET, POST, PATCH, PUT, DELETE, OPTIONS } =
	createSvelteKitConsentRouteHandlers({ backendURL, proxy: true });
```

The option and its rules match `createConsentServerRoute({ proxy })` in
`@c15t/tanstack-start`: only `subjects`, `subjects/:id`, `init`,
`manifest`, `health`, `status` and any `paths` you add are forwarded, and
anything else gets `404`. Cookies are forwarded only when `cookieNames`
names them. The client address comes from `event.getClientAddress()`, and
`x-forwarded-host` and `x-forwarded-proto` from `event.url`.

A relative `backendURL` or `manifestURL`, such as `/api/self-host`, is now
fetched through `event.fetch`, so SvelteKit answers it in-process. The
route handlers used to resolve it against `event.url`, which on
adapter-node without `ORIGIN` takes its host from the client's `Host`
header, so a forged header could send the manifest, init or proxied
request to a host of the client's choosing and return its response. The
`fetch` option now applies to absolute URLs only.

To a remote backend over plain `http:`, the proxy sends only the public
browser headers: no cookies, no custom headers and no `x-forwarded-for`.
Such a backend no longer sees the visitor's IP address, so it cannot use it
for geolocation or rate limiting; use an `https:` backend URL to keep it.
Loopback `http:` backends still receive all three.

The proxy rules now live in `@c15t/core/server` as `forwardConsentRequest`,
`resolveConsentProxyOptions`, `isConsentProxyPathAllowed` and related
helpers, and both adapters use them. Each adapter supplies only what its
framework can trust for the forwarding headers. Both proxies now answer
`504` with a JSON body when the backend misses the deadline and `502` when
it cannot be reached, instead of a framework error page. They also stop
passing `TE`, `Trailer` and any header the backend's `Connection` value
names on to the browser. TanStack Start's proxy otherwise behaves as
before.
