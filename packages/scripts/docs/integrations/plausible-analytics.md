---
title: Plausible Analytics
description: Privacy-friendly cookieless analytics with a prebuilt helper that
  preserves Plausible's queue bootstrap and loader attributes.
group: integrations
icon: plausible
---
Plausible Analytics is a privacy-friendly, cookieless analytics product with a lightweight script loader. The `plausibleAnalytics()` helper models Plausible's queue bootstrap and script attributes as a c15t-managed script so early `window.plausible(...)` calls are buffered safely until the tracker loads.

## Integrate with c15t

**React**

```tsx
import { hosted } from '@c15t/react';
import { type ReactNode } from 'react';
import { ConsentProvider } from 'c15t/react';
import { plausibleAnalytics } from '@c15t/scripts/plausible-analytics';

const scripts = [plausibleAnalytics({ domain: 'example.com' })];

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
import { plausibleAnalytics } from '@c15t/scripts/plausible-analytics';

const scripts = [plausibleAnalytics({ domain: 'example.com' })];

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
import { plausibleAnalytics } from '@c15t/scripts/plausible-analytics';

const kernel = createConsentKernel({
  transport: createHostedTransport({
    backendURL: 'https://consent.example.com',
  }),
});
const persistence = createPersistence({ kernel });
const loader = createScriptLoader({
  kernel,
  scripts: [plausibleAnalytics({ domain: 'example.com' })],
});
await kernel.commands.init();
// On teardown: loader.dispose(); persistence.dispose(); kernel.dispose();
```

## How c15t loads it

* **Category:** `measurement` (Analytics)
* **Loads when:** measurement consent is granted
* **On revocation:** unloaded — c15t removes the script element from the DOM. Plausible is cookieless, so no client-side state needs clearing.

If you need script extensions or hash-based routing support, pass them through the helper:

```ts
plausibleAnalytics({
  domain: 'example.com',
  extension: ['file-downloads', 'outbound-links'],
  hashBasedRouting: true,
});
```

The helper seeds a `window.plausible` queue stub during `onBeforeLoad`, so any calls made between the consent grant and the real script attaching get buffered into `plausible.q` and replayed. It also maps the legacy `data-domain` / `data-api` attributes and the new `scriptId`-based loader URL automatically.

## Tracking events in your app

c15t gates the Plausible script from loading until `measurement` consent is granted. Your application code that calls Plausible is **not** automatically gated — `window.plausible` does not exist until the script is loaded, so unguarded calls before consent throw.

Guard event calls by checking consent state. From React:

```tsx
import { useCallback } from 'react';
import { useConsentManager } from 'c15t/react';

function useTrackSignup() {
  const { has } = useConsentManager();

  return useCallback(() => {
    if (has('measurement')) {
      window.plausible?.('Signup');
    }
  }, [has]);
}

function SignupButton() {
  const trackSignup = useTrackSignup();

  return (
    <button type="button" onClick={trackSignup}>
      Sign up
    </button>
  );
}
```

From plain JavaScript:

```ts
import { evaluateConsent } from '@c15t/core';

// Reuse the kernel created during initialization.

if (evaluateConsent({ category: 'measurement' }, kernel.getSnapshot())) {
  window.plausible?.('Signup');
}
```

## Types

### PlausibleAnalyticsOptions

|Property|Type|Description|Default|Required|
|:--|:--|:--|:--|:--:|
|scriptId|string \|undefined|Unique Plausible script ID for the new script format.|-|Optional|
|domain|string \|undefined|Legacy domain-based site identifier.|-|Optional|
|extension|PlausibleExtension \|PlausibleExtension\[] \|undefined|Legacy script extensions.|-|Optional|
|customProperties|Record\<string, unknown> \|undefined|Properties tracked with each pageview.|-|Optional|
|endpoint|string \|undefined|Custom tracking endpoint.|-|Optional|
|fileDownloads|\{ fileExtensions?: string\[] \|undefined; } \|undefined|File download tracking configuration.|-|Optional|
|hashBasedRouting|boolean \|undefined|Enable hash-based routing support.|-|Optional|
|autoCapturePageviews|boolean \|undefined|Disable automatic pageview capture when set to \`false\`.|-|Optional|
|captureOnLocalhost|boolean \|undefined|Enable tracking on localhost.|-|Optional|
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
