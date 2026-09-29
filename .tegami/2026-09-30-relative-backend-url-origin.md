---
packages:
  '@c15t/core': patch
  '@c15t/svelte': patch
  '@c15t/nextjs': patch
  '@c15t/react': patch
  '@c15t/tanstack-start': patch
  '@c15t/astro': patch
---

### Resolve a relative backendURL against the request, not forwarding headers

A relative `backendURL` or `manifestURL` no longer resolves against client-controlled forwarding headers. The server helpers previously built the backend origin from `x-forwarded-host`, `x-forwarded-proto` or `referer` when present, so a request that set them could make the server send its `/init` or manifest request, with the request's cookies and forwarded headers, to another host.

A relative URL now resolves against the URL the framework resolved the request under (`event.url` in SvelteKit, `request.url` in Next.js route handlers, TanStack Start and Astro), or against the `host` header where no request URL exists (Next.js `resolveConsent`, `fetchSSRData`). A bare `host` resolves over `https` for a domain name and over `http` for `localhost`, an IP address, or a single-label host such as `app:3000`. The `referer` header is no longer used.

Apps behind a proxy that sets forwarding headers and drops incoming ones can opt back in with `trustForwardedHeaders: true` on SvelteKit `loadConsent` and `resolveConsent`, Next.js `resolveConsent`, `createNextConsentRouteHandlers` and `createPagesApiHandlers`, and `@c15t/react/server` `fetchSSRData` and `normalizeBackendURL`, matching the existing TanStack Start option. The rule lives in `resolveRequestBackendURL` and `resolveRequestOrigin`, new exports of `@c15t/core/server`, which every server adapter now shares.
