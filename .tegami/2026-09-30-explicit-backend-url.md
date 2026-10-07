---
packages:
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
  "@c15t/cli":
    replay:
      - exit-prerelease(npm:@c15t/cli)
---

### Pass the backend URL to the server helpers

Breaking. The server helpers no longer read c15t configuration from environment
variables. Pass `backendURL` or `manifestURL`, and read any environment variable
in your own code.

| Helper | No longer read |
| --- | --- |
| `createNextConsentRouteHandlers`, `createPagesApiHandlers` (`c15t/next/api`, `c15t/next/pages`) | `C15T_BACKEND_URL`, `NEXT_PUBLIC_C15T_BACKEND_URL`, `C15T_MANIFEST_URL`, `C15T_MANIFEST_REVALIDATE_SECONDS` |
| `createConsentServerRoute` (`c15t/tanstack-start/api`) | `C15T_BACKEND_URL`, `VITE_C15T_BACKEND_URL`, `C15T_MANIFEST_URL` |
| `createSvelteKitConsentRouteHandlers` (`@c15t/svelte/kit`) | `C15T_BACKEND_URL`, `C15T_MANIFEST_URL` |
| `manifest()` mode and its injected routes (`c15t/astro`) | `C15T_BACKEND_URL`, `PUBLIC_C15T_BACKEND_URL`, `C15T_MANIFEST_URL` |

Without `backendURL` or `manifestURL`, each request throws. Astro's `manifest()`
without a `backendURL` or an inline `manifest` fails when `astro.config` loads.
`manifestRevalidateSeconds` defaults to `300`.

The ready-made handlers are removed: `GET` and `manifestGET` from
`c15t/next/api` and `@c15t/nextjs/api`, and `GET`, `manifestGET` and `initGET`
from `c15t/tanstack-start/api` and `@c15t/tanstack-start/api`. Build them from
your config instead.

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

`c15t setup` writes the backend URL into the generated files as a string. It no
longer writes `.env.local` or `.env.example` and no longer accepts `--env`.
