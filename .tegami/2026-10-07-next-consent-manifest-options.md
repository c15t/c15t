---
packages:
  '@c15t/nextjs': minor
  c15t: minor
---

### Share Next.js consent options with `ConsentManifestOptions`

`resolveConsent` and the consent route handlers now accept one shared options
object. Declare the config and build-time snapshot once and pass the same
object to both, so server rendering and browser initialization read the same
policy. Before, leaving the snapshot off one side fell back to runtime
fetching without an error.

```ts
// c15t.server.ts
import type { ConsentManifestOptions } from 'c15t/next/server';

import { consentManifest } from '@/c15t-manifest';
import { consentConfig } from '@/c15t.config';

export const consentOptions = {
	config: consentConfig,
	manifest: consentManifest,
} satisfies ConsentManifestOptions;
```

The layout calls `resolveConsent(consentOptions)` and the manifest route
exports `createNextConsentRouteHandlers(consentOptions).manifestGET`. To
support this, `createNextConsentRouteHandlers` and `createPagesApiHandlers`
accept a `config` option and read its `backendURL`.
