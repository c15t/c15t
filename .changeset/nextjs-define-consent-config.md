---
'@c15t/nextjs': minor
---

Add `defineConsentConfig` so the consent URLs live in one place. Declare `backendURL` plus the optional same-origin `manifestURL` and `initURL` once, then hand the result to `createNextConsentRouteHandlers` / `createPagesApiHandlers` (route files), `prefetchInitialConsent({ config })` from `@c15t/nextjs/server` or `@c15t/nextjs/pages`, and `<ConsentBoundary consent={...}>`. It is plain frozen data with no `next` imports, exported from the root, `./server`, `./api`, and `./pages`, and validates that every URL is absolute `http(s)` or `/`-relative.

`ConsentBoundary` picks the transport from the config when `options.mode` is not set. With `initURL`, the browser fetches init from the same-origin `GET` handler, which resolves the cached manifest with the request's geo headers, so the visitor's country is known without a backend `/init` call while saves still post to `${backendURL}/subjects`. With only `manifestURL`, init resolves in the browser from the manifest route; the resolver loads on first init so it stays out of the initial bundle. With only `backendURL`, hosted mode runs as before, and the existing `backendURL` prop is unchanged.
