---
title: Script Loader
description: Gate third-party scripts behind consent in React — load Google
  Analytics, Meta Pixel, and other tracking scripts only when users grant
  permission.
group: frameworks
---
\[Error: Could not include file ../../shared/react/guides/script-loader.mdx]

## Basic Usage

Pass an array of scripts to `ConsentProvider`. Built-in helpers from `@c15t/scripts` return plain `Script` objects, so they sit beside app-specific scripts:

```tsx
import { hosted } from '@c15t/react';
import { type ReactNode } from 'react';
import { ConsentProvider } from 'c15t/react';
import { metaPixel } from '@c15t/scripts/meta-pixel';

export function ConsentManager({ children }: { children: ReactNode }) {
  return (
    <ConsentProvider
      options={{
        mode: hosted({ url: 'https://your-instance.c15t.dev' }),
        scripts: [
          metaPixel({ pixelId: '123456' }),
          {
            id: 'custom-analytics',
            src: 'https://cdn.example.com/analytics.js',
            category: 'measurement',
          },
        ],
      }}
    >
      {children}
    </ConsentProvider>
  );
}
```

The provider registers those scripts when the consent runtime starts. From that point on, c15t owns the lifecycle: it checks consent, injects eligible scripts, unloads them when consent is revoked, and runs `onConsentChange` for scripts that stay loaded.

## Recommended Structure

Define your script list once and keep it next to the consent provider so vendor setup stays declarative:

```tsx
import { hosted } from '@c15t/react';
import { type ReactNode } from 'react';
import { ConsentProvider } from 'c15t/react';
import { gtag } from '@c15t/scripts/google-tag';
import { metaPixel } from '@c15t/scripts/meta-pixel';

const scripts = [gtag({ id: 'G-XXXXXXX' }), metaPixel({ pixelId: '123456' })];

export function PrivacyProvider({ children }: { children: ReactNode }) {
  return (
    <ConsentProvider
      options={{
        mode: hosted({ url: 'https://your-instance.c15t.dev' }),
        scripts,
      }}
    >
      {children}
    </ConsentProvider>
  );
}
```

If an integration is route-specific or tenant-specific, use [dynamic script management](#dynamic-script-management) instead of conditionally building this list per render.

\[Error: Could not include file ../../shared/react/guides/script-loader.mdx]

## Dynamic scripts

Keep the provider scripts configuration stable. For an independently mounted
integration, use the exported `useScriptLoader` module hook inside the provider
and dispose its owner on unmount. The core loader handle supports
`updateScripts(nextScripts)` and `getLoadedScriptIds()`.

## Maps and media

Use `Frame` with a service-provided iframe URL for Maps and YouTube embeds.
The specialized v2 components are removed. See [Google Maps](/docs/integrations/google-maps)
and [YouTube](/docs/integrations/youtube) for working examples. For an SDK widget,
register the SDK as a Script and manage each widget instance separately.

\[Error: Could not include file ../../shared/react/guides/script-loader.mdx]
