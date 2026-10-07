---
packages:
  '@c15t/tanstack-start': minor
  c15t: minor
---

### Share TanStack Start consent options with `ConsentManifestOptions`

`c15t/tanstack-start/server` and `c15t/tanstack-start/api` export
`ConsentManifestOptions`, the options `createConsentStateHandler` and
`createConsentServerRoute` both accept. Declare the backend URL and build-time
snapshot once and pass the same object to the server function and the consent
route, so the loader and browser initialization use the same policy:

```ts
// src/consent-options.server.ts
import type { ConsentManifestOptions } from 'c15t/tanstack-start/server';

import { consentManifest } from './c15t-manifest';

export const consentOptions = {
	backendURL: 'https://your-project.inth.app',
	manifest: consentManifest,
} satisfies ConsentManifestOptions;
```

The type adds no runtime code.
