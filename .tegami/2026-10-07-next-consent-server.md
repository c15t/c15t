---
packages:
  '@c15t/nextjs': minor
  c15t: minor
---

### Bind a Next.js consent setup once with `createConsentServer`

`createConsentServer` from `c15t/next/server` takes the consent config, an
optional build-time manifest and the options both sides share. It returns
`resolve()` for layouts and `handlers` for the consent routes, so server
rendering and browser initialization always read the same policy. Before,
the snapshot had to be passed to `resolveConsent` and the route handlers
separately, and leaving it off one side fell back to runtime fetching without
an error.

```ts
// c15t.server.ts
import { createConsentServer } from 'c15t/next/server';

import { consentManifest } from '@/c15t-manifest';
import { consentConfig } from '@/c15t.config';

export const consent = createConsentServer({
	config: consentConfig,
	manifest: consentManifest,
});
```

The layout calls `consent.resolve()` and the manifest route exports
`consent.handlers.manifestGET`. `c15t/next/pages` exports a Pages Router
version whose `resolve()` takes `req` and whose handlers serve `pages/api`
routes. Both wrap the existing helpers without changing how they resolve
consent, and `resolveConsent` and `createNextConsentRouteHandlers` keep working.
