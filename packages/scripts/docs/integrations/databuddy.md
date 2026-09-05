---
title: Databuddy
description: Databuddy is a privacy-focused analytics platform that helps you
  understand user behavior and track events. It supports cookieless tracking and
  manages consent automatically through c15t's consent state synchronization.
icon: databuddy
group: integrations
---
The Databuddy script automatically respects consent preferences by toggling tracking on and off based on the user's consent state.

## Integrate with c15t

**React**

```tsx
import { hosted } from '@c15t/react';
import { type ReactNode } from 'react';
import { ConsentProvider } from 'c15t/react';
import { databuddy } from '@c15t/scripts/databuddy';

const scripts = [
  databuddy({
    clientId: 'your-client-id',
    scriptUrl: 'https://cdn.databuddy.cc/databuddy.js',
    apiUrl: 'https://basket.databuddy.cc',
    configWhenGranted: {
      clientId: 'your-client-id',
      apiUrl: 'https://basket.databuddy.cc',
      disabled: false,
    },
    configWhenDenied: {
      clientId: 'your-client-id',
      apiUrl: 'https://basket.databuddy.cc',
      disabled: true,
    },
  }),
];

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
import { databuddy } from '@c15t/scripts/databuddy';

const scripts = [
  databuddy({
    clientId: 'your-client-id',
    scriptUrl: 'https://cdn.databuddy.cc/databuddy.js',
    apiUrl: 'https://basket.databuddy.cc',
    configWhenGranted: {
      clientId: 'your-client-id',
      apiUrl: 'https://basket.databuddy.cc',
      disabled: false,
    },
    configWhenDenied: {
      clientId: 'your-client-id',
      apiUrl: 'https://basket.databuddy.cc',
      disabled: true,
    },
  }),
];

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
import { databuddy } from '@c15t/scripts/databuddy';

const kernel = createConsentKernel({
  transport: createHostedTransport({
    backendURL: 'https://consent.example.com',
  }),
});
const persistence = createPersistence({ kernel });
const loader = createScriptLoader({
  kernel,
  scripts: [
    databuddy({
      clientId: 'your-client-id',
      scriptUrl: 'https://cdn.databuddy.cc/databuddy.js',
      apiUrl: 'https://basket.databuddy.cc',
      configWhenGranted: {
        clientId: 'your-client-id',
        apiUrl: 'https://basket.databuddy.cc',
        disabled: false,
      },
      configWhenDenied: {
        clientId: 'your-client-id',
        apiUrl: 'https://basket.databuddy.cc',
        disabled: true,
      },
    }),
  ],
});
await kernel.commands.init();
// On teardown: loader.dispose(); persistence.dispose(); kernel.dispose();
```

## How c15t loads it

* **Category:** `measurement` (Analytics)
* **Loads when:** [`alwaysLoad`](/docs/frameworks/react/script-loader#always-load) — runs on page start regardless of consent state
* **On consent change:** c15t toggles `window.databuddy.options.disabled` so tracking turns on or off without removing the script

## Configure the integration

The Databuddy manifest expects explicit initial config objects for the granted
and denied consent states:

```ts
databuddy({
  clientId: 'your-client-id',
  scriptUrl: 'https://cdn.databuddy.cc/databuddy.js',
  apiUrl: 'https://basket.databuddy.cc', // Optional, defaults to basket.databuddy.cc, change if self-hosting
  configWhenGranted: {
    clientId: 'your-client-id',
    apiUrl: 'https://basket.databuddy.cc',
    // Tracking options
    trackScreenViews: true, // Automatically track page views
    trackOutgoingLinks: true, // Track clicks on external links
    trackAttributes: false, // Track data-track attributes on elements
    trackErrors: false, // Track JavaScript errors
    trackPerformance: true, // Track performance metrics
    trackWebVitals: false, // Track Core Web Vitals

    // Network options
    enableBatching: false, // Batch events before sending
    batchSize: 10, // Events per batch
    batchTimeout: 2000, // Batch timeout in ms
    samplingRate: 1.0, // Sample rate (0.0-1.0)
    disabled: false,
  },
  configWhenDenied: {
    clientId: 'your-client-id',
    apiUrl: 'https://basket.databuddy.cc',
    disabled: true,
  },
});
```

## Tracking events in your app

Databuddy is `alwaysLoad: true`, so the script is in the DOM from page start regardless of consent. `window.databuddy` is therefore always defined and calls to `track`, `screenView`, or `setGlobalProperties` are safe to make at any time — when measurement consent is denied, c15t flips `window.databuddy.options.disabled = true` so the SDK becomes a no-op until consent is granted again.

```ts
window.databuddy?.track('signup');
```

You do not need to guard these calls with `useConsentManager().has('measurement')`, but doing so does no harm if you prefer the symmetry with other vendors.

## Consent and privacy

The Databuddy integration automatically handles consent management:

1. **Before Script Load**: Sets `window.databuddyConfig.disabled` based on initial consent state
2. **On Consent Grant**: Enables tracking by setting `window.databuddy.options.disabled = false`
3. **On Consent Revoke**: Disables tracking by setting `window.databuddy.options.disabled = true`

This ensures that no tracking occurs without user consent, keeping your analytics privacy-compliant.

## Types

### DatabuddyConsentOptions

|Property|Type|Description|Default|Required|
|:--|:--|:--|:--|:--:|
|clientId|string|Your Databuddy client ID.|-|✅ Required|
|apiUrl|string \|undefined|Your Databuddy API URL.|'https\://basket.databuddy.cc'|Optional|
|scriptUrl|string \|undefined|The Databuddy script URL.|'https\://cdn.databuddy.cc/databuddy.js'|Optional|
|configWhenGranted|Record\<string, unknown>|Databuddy config object to seed when consent is granted at load time.|-|✅ Required|
|configWhenDenied|Record\<string, unknown>|Databuddy config object to seed when consent is denied at load time.|-|✅ Required|

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
