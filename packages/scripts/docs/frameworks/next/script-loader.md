---
title: Load scripts with consent
description: Register vendor scripts once and let effective permissions control loading.
group: frameworks
---

## Add scripts to your existing boundary

Keep the manifest setup from the [App Router](https://c15t.com/docs/frameworks/next/app-router)
or [Pages Router](https://c15t.com/docs/frameworks/next/pages-router) guide. Put vendor callbacks
in a client wrapper and pass `scripts` as a top-level boundary prop. Keep the
shared `consentConfig`; passing only `backendURL` would switch initialization
back to the backend `/init` path.

| Package manager | Command                     |
| :-------------- | :-------------------------- |
| npm             | `npm install @c15t/scripts` |
| pnpm            | `pnpm add @c15t/scripts`    |
| yarn            | `yarn add @c15t/scripts`    |
| bun             | `bun add @c15t/scripts`     |

```tsx title="components/consent.tsx"
'use client';

import type { ReactNode } from 'react';
import {
  ConsentBoundary,
  ConsentBanner,
  ConsentDialog,
  ConsentDialogLink,
} from 'c15t/next';
import type { ConsentBoundaryProps } from 'c15t/next';
import { metaPixel } from '@c15t/scripts/meta-pixel';
import { consentConfig } from '../consent.config';

const scripts = [metaPixel({ pixelId: '123456789012345' })];

export function Consent({
  children,
  config,
}: {
  children: ReactNode;
  config: ConsentBoundaryProps['config'];
}) {
  return (
    <ConsentBoundary config={config} consent={consentConfig} scripts={scripts}>
      {children}
      <ConsentBanner />
      <ConsentDialog />
      <ConsentDialogLink>Privacy settings</ConsentDialogLink>
    </ConsentBoundary>
  );
}
```

Replace the pixel ID with your own. In the App Router layout, pass the prepared
config to this wrapper:

```tsx title="app/layout.tsx"
import type { ReactNode } from 'react';
import { prefetchInitialConsent } from 'c15t/next/server';
import { Consent } from '../components/consent';
import { consentConfig } from '../consent.config';
import 'c15t/next/styles.css';

export default async function RootLayout({ children }: { children: ReactNode }) {
  const config = await prefetchInitialConsent({ config: consentConfig });
  return (
    <html lang="en">
      <body><Consent config={config}>{children}</Consent></body>
    </html>
  );
}
```

For Pages Router, use this wrapper in `_app.tsx` with
`config={pageProps.consentConfig ?? {}}` and keep the Pages Router prefetch and
API routes. For static export or offline mode, preserve that setup's existing
transport instead of introducing server routes. A `ConsentProvider` receives
`scripts` inside `options`; `ConsentBoundary` receives it as a top-level prop.
Do not mount both providers around the same application.

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
