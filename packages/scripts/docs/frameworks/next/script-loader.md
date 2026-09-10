---
title: Load scripts with consent
description: Register vendor scripts in your existing Next.js consent boundary
  and handle loading and revocation.
group: frameworks
---

## Keep one owner for vendor scripts

The [App Router](https://c15t.com/docs/frameworks/next/app-router) and
[Pages Router](https://c15t.com/docs/frameworks/next/pages-router) setups already register scripts
in a client wrapper. Keep that wrapper and add vendors to `lib/scripts.ts`.
If you are adding scripts to an existing c15t setup, install the helpers and
use the same registration pattern below.

| Package manager | Command                     |
| :-------------- | :-------------------------- |
| npm             | `npm install @c15t/scripts` |
| pnpm            | `pnpm add @c15t/scripts`    |
| yarn            | `yarn add @c15t/scripts`    |
| bun             | `bun add @c15t/scripts`     |

Keep `c15t.config.ts` and the manifest route from your router setup. These shared
URLs connect initialization and consent submissions to the same backend.

## Register scripts in a client wrapper

The [runnable Next.js example](https://c15t.com/docs/examples) uses PostHog for measurement and
X Pixel for marketing. Set `NEXT_PUBLIC_POSTHOG_KEY` and
`NEXT_PUBLIC_X_PIXEL_ID` to your own project identifiers before building.
`NEXT_PUBLIC_POSTHOG_HOST` optionally selects your PostHog region's API host.
Omit a vendor's ID to leave that integration disabled, or replace its helper
with the [integration](../../integrations/overview.md) your application uses. Include the
measurement and marketing categories in your policy for these two vendors.

Create `lib/scripts.ts` with the example's script configuration:

```ts title="lib/scripts.ts"
import { posthog } from '@c15t/scripts/posthog';
import { xPixel } from '@c15t/scripts/x-pixel';
import type { Script } from 'c15t';

export const posthogConfigured = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);
export const xPixelConfigured = Boolean(process.env.NEXT_PUBLIC_X_PIXEL_ID);

export const scripts: Script[] = [];

if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
	scripts.push(
		posthog({
			apiHost: process.env.NEXT_PUBLIC_POSTHOG_HOST,
			id: process.env.NEXT_PUBLIC_POSTHOG_KEY,
			initOptions: { cookieless_mode: 'never' },
			loadMode: 'after-consent',
		})
	);
}

if (process.env.NEXT_PUBLIC_X_PIXEL_ID) {
	scripts.push(xPixel({ pixelId: process.env.NEXT_PUBLIC_X_PIXEL_ID }));
}
```

PostHog waits for measurement consent here. `cookieless_mode: 'never'` disables
cookieless capture after rejection. X Pixel waits for marketing consent. Remove
any existing loader for these vendors, including `next/script` and tag-manager
entries, so each integration loads once.

Create this client wrapper. It keeps scripts and browser callbacks in the client
while the router supplies prepared consent through `config`:

```tsx title="components/consent.tsx"
'use client';

import type { ReactNode } from 'react';
import {
  ConsentBanner,
  ConsentBoundary,
  ConsentDialog,
  ConsentDialogLink,
} from 'c15t/next';
import type { ConsentBoundaryProps } from 'c15t/next';
import { consentConfig } from '../c15t.config';
import { scripts } from '../lib/scripts';

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
      <footer>
        <ConsentDialogLink>Privacy settings</ConsentDialogLink>
      </footer>
    </ConsentBoundary>
  );
}
```

`ConsentBoundary` already provides the consent runtime. Mount this wrapper once;
do not add a second provider. Keep your site's content and footer inside it.

## Pass prepared consent through your router

App Router passes the prefetch promise from its synchronous layout. This partial
example replaces the boundary in your existing layout, keeping its `html`,
`body` and stylesheet:

```tsx
import { prefetchInitialConsent } from 'c15t/next/server';
import { consentConfig } from '../c15t.config';
import { Consent } from '../components/consent';

// Inside the layout:
const initialConsent = prefetchInitialConsent({ config: consentConfig });

<Consent config={initialConsent}>{children}</Consent>
```

Pages Router passes `config={pageProps.initialConsent ?? {}}` to this wrapper
in `_app.tsx`. Keep `getServerSideProps` and its `c15t/next/pages` helper.
The router guides contain complete layout and `_app.tsx` files.

For static export or browser-only initialization, pass `config={{}}` and keep
that setup's existing transport. Register scripts on its existing boundary;
do not introduce server prefetch or local routes just to add a vendor.

## Check each vendor's loading behavior

The example explicitly configures PostHog to load after consent and disables
cookieless capture. Those settings are deliberate; its default helper can load
before consent and use the SDK's consent controls. Read the
[PostHog guide](../../integrations/posthog.md) before changing them.

Ordinary scripts wait for their category's effective permission. Give each
script a stable unique `id` and remove any other loader for the same vendor.
Helpers with `alwaysLoad` may load an SDK before permission is granted; a
category field alone does not guarantee no requests. See the
[vendor guides](../../integrations/overview.md) for their exact contracts.

Removing a script element cannot undo executed JavaScript or requests already
sent. PostHog exposes capture controls; X Pixel has no consent-update API.
Stop future event calls after revocation and test a change from allowed to
denied, as well as initial denial.

## Verify the integration

With an opt-in policy and no saved choice, neither configured example vendor
should load. Allow measurement only: PostHog loads and X Pixel remains blocked.
Reject, reload, and reopen Privacy settings to confirm the choice persists.

Use the [runnable example](https://c15t.com/docs/examples) to inspect the same script definitions
with DevTools, or follow [verification](../../guides/verify-consent.md) in your app.
Use [custom integrations](../../integrations/building-integrations.md) for an
unlisted vendor. Google helpers have a separate
[Consent Mode contract](../../integrations/google-tag-manager.md).
