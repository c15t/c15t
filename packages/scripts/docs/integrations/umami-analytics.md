---
title: Umami Analytics
description: Open-source, cookieless analytics with a prebuilt helper that maps
  Umami's data attributes into a c15t-managed script.
group: integrations
icon: umami-analytics
---
Umami is an open-source, cookieless analytics product configured entirely through `data-*` attributes on its loader. The `umamiAnalytics()` helper serializes your website ID, host override, and tracking options into those attributes and hands the result to c15t's script loader.

## Integrate with c15t

**React**

```tsx
import { hosted } from '@c15t/react';
import { type ReactNode } from 'react';
import { ConsentProvider } from 'c15t/react';
import { umamiAnalytics } from '@c15t/scripts/umami-analytics';

const scripts = [umamiAnalytics({ websiteId: 'site-abc-123' })];

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

**Next.js**

```tsx
'use client';

import { hosted } from '@c15t/nextjs';

import { type ReactNode } from 'react';
import { ConsentProvider } from 'c15t/next';
import { umamiAnalytics } from '@c15t/scripts/umami-analytics';

const scripts = [umamiAnalytics({ websiteId: 'site-abc-123' })];

export function PrivacyProvider({ children }: { children: ReactNode }) {
  return (
    <ConsentProvider
      options={{
        mode: hosted({ url: '/api/c15t' }),
        scripts,
      }}
    >
      {children}
    </ConsentProvider>
  );
}
```

**JavaScript**

```ts
import { createConsentKernel, createHostedTransport } from '@c15t/core';
import { createPersistence } from '@c15t/core/modules/persistence';
import { createScriptLoader } from '@c15t/core/modules/script-loader';
import { umamiAnalytics } from '@c15t/scripts/umami-analytics';

const kernel = createConsentKernel({
  transport: createHostedTransport({
    backendURL: 'https://consent.example.com',
  }),
});
const persistence = createPersistence({ kernel });
const loader = createScriptLoader({
  kernel,
  scripts: [umamiAnalytics({ websiteId: 'site-abc-123' })],
});
await kernel.commands.init();
// On teardown: loader.dispose(); persistence.dispose(); kernel.dispose();
```

## How c15t loads it

* **Category:** `measurement` (Analytics)
* **Loads when:** measurement consent is granted
* **On revocation:** unloaded — c15t removes the script element from the DOM. Umami is cookieless, so no client-side state needs clearing.

If you self-host Umami or need to restrict tracking to specific domains:

```ts
umamiAnalytics({
  websiteId: 'site-abc-123',
  hostUrl: 'https://analytics.example.com',
  domains: ['example.com', 'www.example.com'],
  autoTrack: false,
  tag: 'release-2025',
});
```

Each option is mapped to Umami's published `data-*` attribute (`data-website-id`, `data-host-url`, `data-auto-track`, `data-domains`, `data-tag`, `data-before-send`) and the script uses `defer` so it matches Umami's recommended embed pattern.

> 📝 **Note:**
> beforeSend accepts a string referencing a global hook (e.g. 'window\.umamiBeforeSend'), not a function value. The c15t manifest runtime serializes script configuration, so inline callbacks cannot be passed through it.

## Tracking events in your app

c15t gates the Umami script from loading until `measurement` consent is granted. Your application code that calls Umami's runtime API (`window.umami.track`, `window.umami.identify`) is **not** automatically gated — `window.umami` does not exist until the script is loaded, so unguarded calls before consent throw.

Guard event calls by checking consent state. From React:

```tsx
import { useConsentManager } from 'c15t/react';

function useTrackSignup() {
  const { has } = useConsentManager();

  return () => {
    if (has('measurement')) {
      window.umami?.track('signup');
    }
  };
}
```

From plain JavaScript:

```ts
import { evaluateConsent } from '@c15t/core';

// Reuse the kernel created during initialization.

if (evaluateConsent({ category: 'measurement' }, kernel.getSnapshot())) {
  window.umami?.track('signup');
}
```

## Types

### UmamiAnalyticsOptions

|Property|Type|Description|Default|Required|
|:--|:--|:--|:--|:--:|
|websiteId|string|Your Umami website ID.|-|✅ Required|
|hostUrl|string \|undefined|Override the host that receives analytics events.|-|Optional|
|autoTrack|boolean \|undefined|Disable automatic tracking when set to \`false\`.|-|Optional|
|domains|string \|string\[] \|undefined|Restrict tracking to specific domains.|-|Optional|
|tag|string \|undefined|Attach a tag to tracked events.|-|Optional|
|beforeSend|string \|undefined|Optional global hook name used for Umami's \`data-before-send\` attribute.&#xA;&#xA;Callback functions are intentionally not supported here because the c15t&#xA;manifest runtime cannot serialize custom JavaScript functions.|-|Optional|
|scriptUrl|string \|undefined|Custom loader URL.|'https\://cloud.umami.is/script.js'|Optional|

### Script

|Property|Type|Description|Default|Required|
|:--|:--|:--|:--|:--:|
|id|string|Unique identifier for the script|-|✅ Required|
|src|string \|undefined|URL of the script to load|-|Optional|
|textContent|string \|undefined|Inline JavaScript code to execute|-|Optional|
|category|HasCondition\<AllConsentNames>|Consent category or condition required to load this script|-|✅ Required|
|callbackOnly|boolean \|undefined|Whether this is a callback-only script that doesn't need to load an external resource.&#xA;When true, no script tag will be added to the DOM, only callbacks will be executed.&#xA;&#xA;This is useful for:&#xA;- Managing consent for libraries already loaded on the page&#xA;- Enabling/disabling tracking features based on consent changes&#xA;- Running custom code when consent status changes without loading external scripts&#xA;&#xA;Example use cases:&#xA;- Enabling/disabling Posthog tracking&#xA;- Configuring Google Analytics consent mode&#xA;- Managing cookie consent for embedded content|false|Optional|
|persistAfterConsentRevoked|boolean \|undefined|Whether the script should persist after consent is revoked.|false|Optional|
|alwaysLoad|boolean \|undefined|Whether the script should always load regardless of consent state.&#xA;&#xA;This is useful for scripts like Google Tag Manager or PostHog that manage&#xA;their own consent state internally. The script will load immediately and&#xA;never be unloaded based on consent changes.&#xA;&#xA;Note: When using this option, you are responsible for ensuring the script&#xA;itself respects user consent preferences through its own consent management.|false|Optional|
|fetchPriority|"high" \|"low" \|"auto" \|undefined|Priority hint for browser resource loading|-|Optional|
|attributes|Record\<string, string> \|undefined|Additional attributes to add to the script element|-|Optional|
|async|boolean \|undefined|Whether to use async loading|-|Optional|
|defer|boolean \|undefined|Whether to defer script loading|-|Optional|
|nonce|string \|undefined|Content Security Policy nonce|-|Optional|
|anonymizeId|boolean \|undefined|Whether to use an anonymized ID for the script element, this helps ensure the script is not blocked by ad blockers|true|Optional|
|target|"head" \|"body" \|undefined|Where to inject the script element in the DOM.&#xA;- \`'head'\`: Scripts are appended to \`\<head>\` (default)&#xA;- \`'body'\`: Scripts are appended to \`\<body>\`&#xA;&#xA;Use \`'body'\` for scripts that:&#xA;- Need to manipulate DOM elements that don't exist until body loads&#xA;- Should load after page content for performance reasons&#xA;- Are required by third-party services to be in the body&#xA;&#xA;Use \`'head'\` (default) for scripts that:&#xA;- Need to track early page events (analytics)&#xA;- Should be available before page render&#xA;- Most tracking/analytics scripts|'head'|Optional|
|onBeforeLoad|((info: ScriptCallbackInfo) => void) \|undefined|Callback executed before the script is loaded|-|Optional|
|onLoad|((info: ScriptCallbackInfo) => void) \|undefined|Callback executed when the script loads successfully|-|Optional|
|onError|((info: ScriptCallbackInfo) => void) \|undefined|Callback executed if the script fails to load|-|Optional|
|onConsentChange|((info: ScriptCallbackInfo) => void) \|undefined|Callback executed whenever the consent store is changed.&#xA;This callback only applies to scripts already loaded.|-|Optional|
|vendorId|string \|number \|undefined|IAB TCF vendor ID - links script to a registered vendor.&#xA;&#xA;When in IAB mode, the script will only load if this vendor has consent.&#xA;Takes precedence over \`category\` when in IAB mode.&#xA;Use custom vendor IDs (string or number) to gate non-IAB vendors too.|-|Optional|
|iabPurposes|number\[] \|undefined|IAB TCF purpose IDs this script requires consent for.&#xA;&#xA;When in IAB mode and no vendorId is set, the script will only load&#xA;if ALL specified purposes have consent.|-|Optional|
|iabLegIntPurposes|number\[] \|undefined|IAB TCF legitimate interest purpose IDs.&#xA;&#xA;These purposes can operate under legitimate interest instead of consent.&#xA;The script loads if all iabPurposes have consent OR all iabLegIntPurposes&#xA;have legitimate interest established.|-|Optional|
|iabSpecialFeatures|number\[] \|undefined|IAB TCF special feature IDs this script requires.&#xA;&#xA;Special features require explicit opt-in:&#xA;- 1: Use precise geolocation data&#xA;- 2: Actively scan device characteristics for identification|-|Optional|
