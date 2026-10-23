---
packages:
  'c15t': minor
  '@c15t/core': minor
  '@c15t/nextjs': minor
  '@c15t/tanstack-start': minor
  '@c15t/astro': minor
  '@c15t/svelte': minor
  '@c15t/vue': minor
---

### Set the subject ID cookie on the server

The framework adapters now give a new visitor a subject ID on their first
request. The server sets it in the `c15t-sid` cookie and the server render
uses the same ID, so the browser starts with it instead of creating its own.
The cookie holds only the ID: the banner still shows until the visitor
decides.

- Next.js: `c15tProxy` sets the cookie and forwards it on the request, so
  `resolveConsent` in the same request reads it. `withConsentProps` sets it
  for Pages Router pages. Both accept `storage`, `trustForwardedHeaders`
  and `subjectCookie`. Without the proxy, App Router pages leave it to the
  browser.
- TanStack Start: `consentRequestMiddleware` sets it and accepts the same
  options. Prerendered pages get none.
- Astro: the c15t middleware sets it on server-rendered pages, named from
  `storageConfig`. `middleware.trustForwardedHeaders` and
  `middleware.subjectCookie` are new. With a `consentSource`, pass
  `subjectCookie: false`.
- SvelteKit: `c15tHandle` sets it and exposes the request cookie as
  `locals.c15t.cookie`. `storage`, `trustForwardedHeaders` and
  `subjectCookie` are new options. With `persistence: false` or a
  `consentSource` on `ConsentProvider`, pass `subjectCookie: false`.
- Nuxt: the plugin sets it during server rendering, except for prerendered
  and cached routes.

Prefetch and prerender requests, and responses marked as shared, never get a
cookie, because every visitor who received it would share the ID. Neither does
the consent route, which renders no page and serves its manifest as public
data a shared cache keeps: Next.js skips the `routePrefix` in
`c15t.config.ts`, SvelteKit and Astro skip their `routePrefix`, and each falls
back to `/api/c15t`. The Next.js proxy and the SvelteKit handle run before
the response exists, so pass `subjectCookie: false` for requests to other
routes a shared cache keeps, such as a public API route or feed; the
consent headers are still normalized. TanStack Start sees the response: a
page whose `resolveConsent` read the visitor's cookies holds the visitor's
consent and subject ID, so it is sent `private` with the cookie, keeping
its browser directives. A response with no such render that sets
`public`, `s-maxage`, `max-age`, `no-cache` or `Expires` gets no cookie, and
TanStack Start also skips `/api/c15t`. Render HTML you cache for every
visitor with `shared: true`. Pass the same `storage` options as the
browser so the cookie has the same name, domain and lifetime. With
`persistence={false}` or a `consentSource` on `ConsentRoot`, pass
`subjectCookie: false` so the server sets no cookie.

On another server, `resolveRequestSubject()` from `c15t/server` returns the
visitor's ID, the `Set-Cookie` value to send and the request `Cookie` header
to render with.

The server helpers read a Node-style header record under any header-name
casing. `resolveRequestSubject()` and `readRequestConsent()` find a `Cookie` or
`COOKIE` header, and the request origin finds `Host`. Forwarding headers are
still read only with `trustForwardedHeaders: true`.

The server and the adapters never replace a `c15t-sid` cookie the request
already has. While the browser's cookie writes succeed, the server render and
the browser use the same ID. The server reads cookies only, though. If the
browser refuses to rewrite a record cookie after the subject ID changes, a
server render keeps reporting the old ID that cookie holds, and the browser
starts with the new ID from its localStorage. This happens even when the
request's `c15t-sid` cookie already holds the new ID. It lasts until a later
write of that record reaches the cookie, which may never happen while the
browser keeps refusing it.
