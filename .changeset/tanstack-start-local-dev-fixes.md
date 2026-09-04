---
'@c15t/tanstack-start': patch
'@c15t/react': patch
---

Fix two issues surfaced by the new TanStack Start example:

- `@c15t/tanstack-start/server` now returns a `ConsentConfig` (a `KernelConfig` without the function-typed `transport` field), so `createServerFn({ method: 'GET' }).handler(createConsentConfigHandler(...))` type-checks against TanStack Start's serializable-return validation. A relative `backendURL` such as `/api/self-host` also resolves with the request's own protocol instead of assuming `https`, which made every same-origin manifest fetch fail with a TLS error under `vite dev`.
- `@c15t/react` adds the `?ref=<hostname>` referral parameter to the branding link only after hydration. Reading `window.location` during the hydration render produced a different `href` than the server markup and triggered React's attribute-mismatch warning on every SSR page.
