---
title: Rybbit Analytics
description: Privacy-friendly analytics with script-tag configuration via
  Rybbit's data attributes.
group: integrations
icon: rybbit-analytics
---
Rybbit Analytics loads through `@c15t/scripts` and configures tracking behavior via `data-*` attributes on the script element.

## Integrate with c15t

**React**

```tsx
import { hosted } from '@c15t/react';
import { type ReactNode } from 'react';
import { ConsentProvider } from 'c15t/react';
import { rybbitAnalytics } from '@c15t/scripts/rybbit-analytics';

const scripts = [rybbitAnalytics({ siteId: 'rybbit-123' })];

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
import { rybbitAnalytics } from '@c15t/scripts/rybbit-analytics';

const scripts = [rybbitAnalytics({ siteId: 'rybbit-123' })];

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
import { rybbitAnalytics } from '@c15t/scripts/rybbit-analytics';

const kernel = createConsentKernel({
  transport: createHostedTransport({
    backendURL: 'https://consent.example.com',
  }),
});
const persistence = createPersistence({ kernel });
const loader = createScriptLoader({
  kernel,
  scripts: [rybbitAnalytics({ siteId: 'rybbit-123' })],
});
await kernel.commands.init();
// On teardown: loader.dispose(); persistence.dispose(); kernel.dispose();
```

## How c15t loads it

* **Category:** `measurement` (Analytics)
* **Loads when:** measurement consent is granted
* **On revocation:** unloaded - c15t removes the script from the DOM and stops network activity until consent is granted again.

To use a custom analytics host:

```ts
rybbitAnalytics({
  siteId: 'rybbit-123',
  analyticsHost: 'https://analytics.example.com',
});
```

## Tracking events in your app

c15t gates the Rybbit script from loading until `measurement` consent is granted. Your application code that calls Rybbit's runtime API (`window.rybbit`) is **not** automatically gated - `window.rybbit` does not exist until the script is loaded, so unguarded calls before consent throw.

Guard event calls by checking consent state. From React:

```tsx
import { useCallback } from 'react';
import { useConsentManager } from 'c15t/react';

export default function SignupExample() {
  const { has } = useConsentManager();

  const trackSignup = useCallback(() => {
    if (has('measurement')) {
      window.rybbit?.event('signup');
    }
  }, [has]);

  return <button onClick={trackSignup}>Sign up</button>;
}
```

From plain JavaScript:

```ts
import { evaluateConsent } from '@c15t/core';

// Reuse the kernel created during initialization.

if (evaluateConsent({ category: 'measurement' }, kernel.getSnapshot())) {
  window.rybbit?.event('signup');
}
```

## Types

### RybbitAnalyticsOptions

|Property|Type|Description|Default|Required|
|:--|:--|:--|:--|:--:|
|siteId|string \|number|Your Rybbit site ID.|-|✅ Required|
|autoTrackPageview|boolean \|undefined|Automatically track pageviews.|-|Optional|
|trackSpa|boolean \|undefined|Enable SPA route tracking.|-|Optional|
|trackQuery|boolean \|undefined|Include query parameters in tracked URLs.|-|Optional|
|trackOutbound|boolean \|undefined|Track outbound link clicks.|-|Optional|
|trackErrors|boolean \|undefined|Track JavaScript errors.|-|Optional|
|sessionReplay|boolean \|undefined|Enable session replay.|-|Optional|
|webVitals|boolean \|undefined|Enable Web Vitals tracking.|-|Optional|
|skipPatterns|string\[] \|undefined|URL patterns to skip from tracking.|-|Optional|
|maskPatterns|string\[] \|undefined|URL patterns to mask in tracked data.|-|Optional|
|debounce|number \|undefined|Debounce interval for pageview tracking.|-|Optional|
|apiKey|string \|undefined|API key for authenticated tracking.|-|Optional|
|analyticsHost|string \|undefined|Override the analytics host URL.|-|Optional|
|scriptUrl|string \|undefined|Custom loader URL.|-|Optional|

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
