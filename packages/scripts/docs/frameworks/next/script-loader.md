---
title: Load scripts with consent
description: Register vendor scripts once and let effective permissions control loading.
group: frameworks
---

## Register scripts on the provider

Install `@c15t/scripts` for vendor helpers. This React-compatible client component
uses Inth as the backend. Set the URL to the endpoint supplied by your Inth
project and keep the component mounted around your application.

```tsx title="components/consent.tsx"
'use client';

import type { ReactNode } from 'react';
import { ConsentProvider, ConsentBanner, ConsentDialog, ConsentDialogLink, hosted } from '@c15t/nextjs';
import { metaPixel } from '@c15t/scripts/meta-pixel';

const mode = hosted({ url: 'https://your-project.inth.app' });
const scripts = [metaPixel({ pixelId: '123456789012345' })];

export function Consent({ children }: { children: ReactNode }) {
  return (
    <ConsentProvider options={{ mode, scripts }}>
      {children}
      <ConsentBanner />
      <ConsentDialog />
      <ConsentDialogLink>Privacy settings</ConsentDialogLink>
    </ConsentProvider>
  );
}
```

Import your adapter's stylesheet globally, as in the framework quickstart. For
an existing server-prefetched `ConsentBoundary`, keep that boundary and pass
`scripts` as a top-level prop instead of mounting a second provider.

## Understand loading and revocation

Ordinary scripts wait for their category's effective permission. Give each
script a stable unique `id` and remove any other loader for the same vendor.
Some helpers use `alwaysLoad` to load the SDK and signal consent through its own
API. Read the vendor guide; a category field alone does not guarantee no
requests.

Removing a script element cannot undo JavaScript that already executed or
requests already sent. Use the vendor's supported consent and cleanup behavior,
and stop future event calls after revocation. Test both initial denial and a
change from allowed to denied.

Use [custom integrations](../../integrations/building-integrations.md) for an
unlisted vendor and [verification](../../guides/verify-consent.md) for the network
checks. Google helpers have a separate
[Consent Mode contract](../../integrations/google-tag-manager.md).
