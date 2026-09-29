---
packages:
  '@c15t/svelte': patch
---

### Forward consent saves through the SvelteKit consent route

`createSvelteKitConsentRouteHandlers` answered `GET` only, so a provider
using `hosted({ url: '/api/c15t' })` got `405` on every save. Pass
`proxy: true` and the handlers add `POST`, `PATCH`, `PUT`, `DELETE` and
`OPTIONS`, which forward to `backendURL`. `GET` forwards paths other than
`init` and `manifest`, which are still resolved in-process. Export all six
from the catch-all route:

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
