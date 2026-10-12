---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
  "@c15t/schema":
    replay:
      - exit-prerelease(npm:@c15t/schema)
---

### Resolve a relative backendURL against the request, not forwarding headers

A relative `backendURL` or `manifestURL` no longer resolves against
`x-forwarded-host`, `x-forwarded-proto` or `referer`. A request that set them
could make the server send its `/init` or manifest request, with the request's
cookies, to another host. It resolves against the framework's request URL
instead, or the `host` header where there is none (Next.js `resolveConsent`,
`fetchSSRData`). A bare `host` uses `https`, except `localhost`, IP addresses
and single-label hosts such as `app:3000`, which use `http`.

If your proxy sets forwarding headers and drops incoming ones, opt back in with
`trustForwardedHeaders: true` on SvelteKit `loadConsent` and `resolveConsent`,
Next.js `resolveConsent`, `createNextConsentRouteHandlers` and
`createPagesApiHandlers`, and `fetchSSRData` and `normalizeBackendURL` from
`@c15t/react/server`. TanStack Start already had this option. Without it, the
SvelteKit and `@c15t/react/server` helpers also stop passing the client's
`forwarded`, `x-forwarded-host` and `x-forwarded-proto` headers to the backend.

`@c15t/core/server` exports `resolveRequestBackendURL` and
`resolveRequestOrigin`. `resolveBackendURL` from `@c15t/schema/types` is
deprecated in favor of `resolveRequestBackendURL` and follows the same rule.
Pass `{ trustForwardedHeaders: true }` as its third argument to restore the old
resolution order.
