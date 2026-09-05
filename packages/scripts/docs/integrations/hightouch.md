---
title: Hightouch
description: Load Hightouch Events with c15t and gate the browser SDK behind
  measurement consent.
group: integrations
icon: hightouch
---
[Hightouch Events](https://hightouch.com/docs/events/overview) collects customer behavior from websites and sends it into Hightouch for warehouse-backed analytics, activation, and real-time workflows. The `hightouch()` helper creates Hightouch's `window.htevents` queue, records the write key and optional API host for the standalone loader, optionally queues the initial `page()` call, and loads the browser SDK when `measurement` consent is available.

## Integrate with c15t

**React**

```tsx
import { hosted } from '@c15t/react';
import { type ReactNode } from 'react';
import { ConsentProvider } from 'c15t/react';
import { hightouch } from '@c15t/scripts/hightouch';

const scripts = [
  hightouch({
    writeKey: 'WRITE_KEY',
    apiHost: 'us-east-1.hightouch-events.com',
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
import { hightouch } from '@c15t/scripts/hightouch';

const scripts = [
  hightouch({
    writeKey: 'WRITE_KEY',
    apiHost: 'us-east-1.hightouch-events.com',
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
import { hightouch } from '@c15t/scripts/hightouch';

const kernel = createConsentKernel({
  transport: createHostedTransport({
    backendURL: 'https://consent.example.com',
  }),
});
const persistence = createPersistence({ kernel });
const loader = createScriptLoader({
  kernel,
  scripts: [
    hightouch({
      writeKey: 'WRITE_KEY',
      apiHost: 'us-east-1.hightouch-events.com',
    }),
  ],
});
await kernel.commands.init();
// On teardown: loader.dispose(); persistence.dispose(); kernel.dispose();
```

## How c15t loads it

* **Category:** `measurement` (Analytics)
* **Loads when:** measurement consent is granted
* **On revocation:** unloaded - c15t removes the script element it created. The `window.htevents` runtime object is left in place until the next page load (c15t reloads the page on revocation by default), so treat the load gate as the consent boundary.

The helper maps Hightouch's browser snippet into the manifest engine:

```ts
hightouch({
  writeKey: 'WRITE_KEY',
  apiHost: 'us-east-1.hightouch-events.com',
});
```

It creates `window.htevents`, defines the official queue methods, queues:

```ts
window.htevents.load('WRITE_KEY', {
  apiHost: 'us-east-1.hightouch-events.com',
});
window.htevents.page();
```

and loads:

```txt
https://cdn.hightouch-events.com/browser/release/v1-latest/events.min.js
```

`writeKey` is required and must be a non-empty string after trimming. `apiHost` is optional; Hightouch's SDK defaults to `us-east-1.hightouch-events.com`, so pass it only when your Event Source uses another region or a first-party tracking host.

## Configure page tracking

By default the helper queues `htevents.page()` before the vendor bundle loads. If you want to handle page views yourself, set `trackPageView` to `false`.

```ts
import { hightouch } from '@c15t/scripts/hightouch';

hightouch({
  writeKey: 'WRITE_KEY',
  trackPageView: false,
});
```

To proxy or self-host the loader, pass a custom URL:

```ts
hightouch({
  writeKey: 'WRITE_KEY',
  scriptUrl: 'https://analytics.example.com/events.min.js',
});
```

## Consent behavior

c15t blocks the Hightouch SDK from loading until `measurement` consent is granted and unloads it on revocation. Hightouch does not expose a browser API that prevents collection while loaded — the SDK writes identifiers and delivers events to Hightouch as soon as it runs — so gating the load is the only default that reliably honors missing or denied consent. See the [RudderStack consent notes](/docs/integrations/rudderstack#consent-behavior) for the full reasoning behind this model versus vendor consent-API mapping (as used for Google Tag Manager).

## Tracking events in your app

c15t gates the Hightouch browser SDK from loading until `measurement` consent is granted. Your application code that calls Hightouch's runtime API (`window.htevents.track`, `identify`, etc.) is **not** automatically gated - `window.htevents` does not exist until c15t initializes the integration, so unguarded calls made before that (or while consent is denied) throw. Once the integration is initialized with consent, early calls queue normally until the SDK finishes loading.

Guard event calls by checking consent state. From React:

```tsx
import { useCallback } from 'react';
import { useConsentManager } from 'c15t/react';

function SignupExample() {
  const { has } = useConsentManager();

  const trackSignup = useCallback(() => {
    if (has('measurement')) {
      window.htevents?.track('Signup Completed', { plan: 'pro' });
    }
  }, [has]);
}
```

From plain JavaScript:

```ts
import { evaluateConsent } from '@c15t/core';

// Reuse the kernel created during initialization.

if (evaluateConsent({ category: 'measurement' }, kernel.getSnapshot())) {
  window.htevents?.track('Signup Completed', { plan: 'pro' });
}
```

## Types

### HightouchOptions

|Property|Type|Description|Default|Required|
|:--|:--|:--|:--|:--:|
|writeKey|string|Hightouch Events write key from your Event Source.|-|✅ Required|
|apiHost|string \|undefined|Optional Hightouch Events API host.&#xA;&#xA;Hightouch's browser SDK defaults to \`us-east-1.hightouch-events.com\`.&#xA;Pass this only when your Event Source uses another region or a first-party&#xA;tracking host.|-|Optional|
|trackPageView|boolean \|undefined|Queue the initial \`htevents.page()\` call during setup.|true|Optional|
|scriptUrl|string \|undefined|Optional full loader URL override.|'https\://cdn.hightouch-events.com/browser/release/v1-latest/events.min.js'|Optional|

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
