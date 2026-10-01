---
packages:
  c15t: minor
  '@c15t/nextjs': minor
  '@c15t/tanstack-start': minor
  '@c15t/svelte': minor
  '@c15t/astro': minor
  '@c15t/cli': minor
---

### Pass the backend URL to the server helpers

**Breaking.** The server helpers no longer read c15t configuration from environment variables. Pass `backendURL` or `manifestURL` to them. If you keep the URL in an environment variable, read it in your own code and pass the value.

| Helper | No longer read |
| --- | --- |
| `createNextConsentRouteHandlers`, `createPagesApiHandlers` (`c15t/next/api`, `c15t/next/pages`) | `C15T_BACKEND_URL`, `NEXT_PUBLIC_C15T_BACKEND_URL`, `C15T_MANIFEST_URL`, `C15T_MANIFEST_REVALIDATE_SECONDS` |
| `createConsentServerRoute` (`c15t/tanstack-start/api`) | `C15T_BACKEND_URL`, `VITE_C15T_BACKEND_URL`, `C15T_MANIFEST_URL` |
| `createSvelteKitConsentRouteHandlers` (`@c15t/svelte/kit`) | `C15T_BACKEND_URL`, `C15T_MANIFEST_URL` |
| `manifest()` mode and its injected routes (`c15t/astro`) | `C15T_BACKEND_URL`, `PUBLIC_C15T_BACKEND_URL`, `C15T_MANIFEST_URL` |

These helpers now take a required options argument. Without `backendURL` or `manifestURL`, each request throws, for example `@c15t/nextjs/api: pass backendURL or manifestURL.` Astro's `manifest()` without a `backendURL` or an inline `manifest` fails when `astro.config` loads. `manifestRevalidateSeconds` defaults to `300`.

The ready-made handlers built from environment variables are removed: `GET` and `manifestGET` from `c15t/next/api` and `@c15t/nextjs/api`, and `GET`, `manifestGET` and `initGET` from `c15t/tanstack-start/api` and `@c15t/tanstack-start/api`.

Before:

```ts title="app/api/c15t/manifest/route.ts"
export { manifestGET as GET } from 'c15t/next/api';
```

After:

```ts title="app/api/c15t/manifest/route.ts"
import { createNextConsentRouteHandlers } from 'c15t/next/api';

import { consentConfig } from '@/c15t.config';

export const { manifestGET: GET } =
	createNextConsentRouteHandlers(consentConfig);
```

The init route takes `GET` from the same call. You can pass options instead of a config, for example `createNextConsentRouteHandlers({ backendURL: 'https://your-project.inth.app' })`.

`c15t setup` writes the chosen backend URL into the generated components, `c15t.config.ts` and the `next.config` rewrite as a string. Quotes and backslashes in the URL are escaped, so they no longer break the generated `next.config`. It no longer writes `.env.local` or `.env.example`, no longer asks whether to store the URL in a `.env` file, and no longer accepts `--env`.
