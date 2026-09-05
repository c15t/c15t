---
"@c15t/tanstack-start": minor
---

feat(tanstack-start): opt-in same-origin proxy for the consent route

`createConsentServerRoute({ proxy: true })` (or `proxy: { paths, forwardHeaders }`) forwards `POST /subjects`, `PATCH /subjects/:id`, `health`, `status`, and any extra allowlisted path to `backendURL` through the app's own `/api/c15t/$` route, so `ConsentBoundary` can take `backendURL="/api/c15t"` the way a Next.js app uses a `next.config` rewrite. `manifest` and `init` stay resolved in-process, unknown paths are a 404, and the returned handlers now include `POST`, `PATCH`, `PUT`, `DELETE`, `OPTIONS`, and a bare `proxyHandler`. With `proxy` off nothing changes.

The proxy forwards the browser's identity headers (`user-agent`, `accept-language`, `origin`, `referer`, `sec-gpc`, geo headers), cookies only when `cookieNames` names them, and, only with `trustForwardedHeaders: true` (behind a proxy that sets and sanitizes forwarded headers, such as Vercel or Cloudflare), the client IP chain in `x-forwarded-for`; it then adds `x-forwarded-host`, `x-forwarded-proto`, `x-c15t-version`, and `x-c15t-proxy: @c15t/tanstack-start`, so a hosted backend behind Vercel Firewall or Cloudflare scores the request like a direct visitor and can key a bypass rule on it. Upstream `set-cookie` headers lose their `Domain=` attribute; hop-by-hop, `content-encoding`, `content-length`, and `access-control-*` headers are stripped.

Caveat: Vercel Attack Challenge Mode and Cloudflare Super Bot Fight Mode still block the proxied write unless the consent paths are exempted, because a server cannot solve a browser challenge. Server-side `prefetchInitialConsent` must keep receiving the absolute backend URL; its self-route guard skips a relative `/api/c15t`.

Proxy paths are percent-decoded before the allowlist check, so encoded dot or separator segments are rejected like literal ones, and `proxy.cookieNames` names the cookies to forward (none by default). `prefetchInitialConsent` forwards cookies and `forwardHeaders` on the manifest fetch and gains the same `cookieNames` option; `consentRequestMiddleware({ language })` now writes the override onto `accept-language` so header-only readers see it.

Hardening from review: a relative `backendURL` resolves against `request.url` rather than client-controlled `x-forwarded-*` headers unless `trustForwardedHeaders: true` is set; no cookies are forwarded by the proxy or the prefetch unless `cookieNames` names them; proxy path segments are decoded until stable so doubly encoded traversal is rejected; upstream proxy requests carry a `timeoutMs` deadline (10 s by default); `consentRequestMiddleware` remembers its inputs per request so `readInitialConsentConfig` and the init route see overrides even when `request.headers` are immutable; `ConsentBoundary` consumes the response a `consentPrefetchHead()` script started instead of issuing a second init request; `createStaticManifestModule` rejects an `exportName` that is not an identifier.

