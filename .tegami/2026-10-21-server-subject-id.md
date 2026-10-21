---
packages:
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

Prefetch and prerender requests, and responses marked as shared, never get
a cookie, because every visitor who received it would share the ID. Pass the
same `storage` options as the browser so the cookie has the same name, domain
and lifetime. With `persistence={false}` or a `consentSource` on `ConsentRoot`,
pass `subjectCookie: false` so the server sets no cookie.

On another server, `resolveRequestSubject()` from `c15t/server` returns the
visitor's ID, the `Set-Cookie` value to send and the request `Cookie` header
to render with.
