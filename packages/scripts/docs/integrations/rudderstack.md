---
title: RudderStack
description: Load RudderStack's JavaScript SDK with c15t and gate the browser
  SDK behind measurement consent.
group: integrations
icon: rudderstack
---
[RudderStack](https://www.rudderstack.com/) collects customer data from websites and routes it through your RudderStack data plane to downstream destinations. The `rudderstack()` helper creates RudderStack's `window.rudderanalytics` v3 queue, queues the required `load()` call with your write key and data plane URL, optionally queues the initial `page()` call, and loads the browser SDK when `measurement` consent is available.

## Integrate with c15t

**React**

```tsx
import { hosted } from '@c15t/react';
import { type ReactNode } from 'react';
import { ConsentProvider } from 'c15t/react';
import { rudderstack } from '@c15t/scripts/rudderstack';

const scripts = [
  rudderstack({
    writeKey: 'WRITE_KEY',
    dataPlaneUrl: 'https://example.dataplane.rudderstack.com',
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
import { rudderstack } from '@c15t/scripts/rudderstack';

const scripts = [
  rudderstack({
    writeKey: 'WRITE_KEY',
    dataPlaneUrl: 'https://example.dataplane.rudderstack.com',
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
import { rudderstack } from '@c15t/scripts/rudderstack';

const kernel = createConsentKernel({
  transport: createHostedTransport({
    backendURL: 'https://consent.example.com',
  }),
});
const persistence = createPersistence({ kernel });
const loader = createScriptLoader({
  kernel,
  scripts: [
    rudderstack({
      writeKey: 'WRITE_KEY',
      dataPlaneUrl: 'https://example.dataplane.rudderstack.com',
    }),
  ],
});
await kernel.commands.init();
// On teardown: loader.dispose(); persistence.dispose(); kernel.dispose();
```

## How c15t loads it

* **Category:** `measurement` (Analytics)
* **Loads when:** measurement consent is granted
* **On revocation:** unloaded - c15t removes the script element from the DOM and clears RudderStack globals until consent is granted again.

The helper maps RudderStack's v3 browser snippet into the manifest engine:

```ts
rudderstack({
  writeKey: 'WRITE_KEY',
  dataPlaneUrl: 'https://example.dataplane.rudderstack.com',
});
```

It creates `window.rudderanalytics`, defines the v3 snippet queue methods, queues:

```ts
window.rudderanalytics.load(
  'WRITE_KEY',
  'https://example.dataplane.rudderstack.com',
  {}
);
window.rudderanalytics.page();
```

and loads:

```txt
https://cdn.rudderlabs.com/v3/modern/rsa.min.js
```

`writeKey` and `dataPlaneUrl` are both required and must be non-empty strings after trimming. `dataPlaneUrl` must be a valid HTTPS URL.

## Configure load options

Pass `loadOptions` to provide RudderStack SDK options as the third `load()` argument. Values must be JSON-serializable: plain objects, arrays, strings, numbers, booleans, and `null`.

```ts
import { rudderstack } from '@c15t/scripts/rudderstack';

rudderstack({
  writeKey: 'WRITE_KEY',
  dataPlaneUrl: 'https://example.dataplane.rudderstack.com',
  loadOptions: {
    useBeacon: true,
    plugins: ['BeaconQueue'],
  },
});
```

Do not pass functions, Dates, Maps, Sets, class instances, symbols, or other non-JSON values in `loadOptions`.

## Configure page tracking

By default the helper queues `rudderanalytics.page()` before the vendor bundle loads. If you want to handle page views yourself, set `trackPageView` to `false`.

```ts
rudderstack({
  writeKey: 'WRITE_KEY',
  dataPlaneUrl: 'https://example.dataplane.rudderstack.com',
  trackPageView: false,
});
```

To proxy or self-host the loader, pass a custom URL:

```ts
rudderstack({
  writeKey: 'WRITE_KEY',
  dataPlaneUrl: 'https://example.dataplane.rudderstack.com',
  scriptUrl: 'https://analytics.example.com/rsa.min.js',
});
```

## Consent behavior

RudderStack exposes a `consent()` API for its own consent-management flow and pre-consent event handling. That API is not a simple runtime opt-out or revocation API for c15t to call after a user withdraws `measurement` consent.

c15t therefore uses the post-consent model recommended by RudderStack's docs: it does not load the SDK until `measurement` consent is granted, and it unloads the script if that consent is later revoked.

### Why c15t blocks the load instead of mapping consent into RudderStack

Some integrations — Google Tag Manager is the clearest example — load immediately and receive c15t's consent state through the vendor's own consent API (Google Consent Mode v2). That model is only safe when the vendor API provides denied-by-default semantics where **nothing identifying is stored or transmitted before consent**.

Loading the RudderStack SDK does not provide that guarantee on its own: once loaded normally it writes its `anonymousId` cookie and delivers events to your data plane, and the `consent()` API filters which downstream *destinations* receive those events rather than preventing collection. Even RudderStack's pre-consent mode defaults to `events.delivery: 'immediate'`, which still sends pre-decision events. "Loaded but consent-filtered" is still collection, so c15t treats blocking the load as the only default that reliably honors a missing or denied `measurement` consent.

RudderStack v3 does offer a pre-consent mode (`preConsent` load options with storage disabled and buffered delivery) designed for CMP integrations, which allows a GTM-style flow. c15t supports it as an explicit opt-in — see below. It is not the default because it runs vendor code before consent and depends on vendor-side configuration (consent IDs on every destination) that c15t cannot verify from the browser.

The same reasoning applies to the other customer-data-platform helpers (Segment, Hightouch): their consent surfaces are destination filters, not collection gates, so those helpers block the load too.

### Opt-in: pre-consent mode with consent ID mapping

Pass `consentManagement` to make c15t the consent provider for RudderStack's pre-consent flow:

```ts
import { rudderstack } from '@c15t/scripts/rudderstack';

rudderstack({
  writeKey: 'WRITE_KEY',
  dataPlaneUrl: 'https://example.dataplane.rudderstack.com',
  consentManagement: {
    // c15t category → RudderStack consent IDs (from your destination settings)
    mapping: {
      measurement: ['product-analytics'],
      marketing: ['ad-destinations'],
    },
  },
});
```

In this mode:

* The SDK loads immediately for every visitor, but **inert**: `preConsent` is enabled with storage strategy `none` (no cookies, no localStorage) and buffered event delivery — nothing reaches your data plane before a consent decision.
* On every consent decision and change, c15t calls `rudderanalytics.consent()` with `allowedConsentIds`/`deniedConsentIds` partitioned from your mapping. The initial signal is queued before the SDK loads, so consent state is known the moment the SDK initializes.
* Consent revocation re-signals with the denied IDs instead of unloading the script.

**Event attribution.** This is the reason to opt in: events fired before the user interacts with the consent banner (the initial `page()` call, early product events) are buffered and delivered once consent is granted, so consenting users keep their full journey. In the default blocked-load mode those pre-consent events are simply lost. If you want session stitching across the consent boundary as well, pass your own `preConsent` in `loadOptions` with storage strategy `'session'` — c15t keeps your storage choice but always forces `preConsent.enabled`, buffered event delivery, and the `custom` consent provider, since any of those falling back to SDK defaults would leak pre-consent events.

**Requirements and caveats:**

* Every destination in your RudderStack workspace must be assigned the consent IDs used in the mapping. Destinations without consent IDs receive events regardless of consent — that is RudderStack behavior c15t cannot detect or prevent from the browser.
* Users who never consent have their buffered events discarded; nothing is persisted for them.
* The daily [script vendor monitor](https://github.com/c15t/c15t/issues/899) probes this mode against the live SDK: it loads RudderStack with denied consent in a real browser and asserts zero data plane requests and zero `rl_*` storage, so a vendor-side change to pre-consent semantics is caught automatically.

### Choosing a consent model for CDPs

* **Default (blocked load)** — strictest interpretation of consent; no vendor code runs pre-consent. Pre-consent events are lost. Right when compliance posture outweighs attribution.
* **Pre-consent mode (`consentManagement`)** — vendor-sanctioned CMP flow; pre-consent events are buffered and attributed for consenting users. Requires disciplined destination consent-ID configuration and accepts vendor code running before consent, with the live monitor verifying its inertness daily.

## Tracking events in your app

c15t gates the RudderStack browser SDK from loading until `measurement` consent is granted. Your application code that calls RudderStack's runtime API (`window.rudderanalytics.track`, `identify`, etc.) is **not** automatically gated - `window.rudderanalytics` does not exist until the script is loaded, so unguarded calls before consent throw.

Guard event calls by checking consent state. From React:

```tsx
import { useCallback } from 'react';
import { useConsentManager } from 'c15t/react';

function SignupExample() {
  const { has } = useConsentManager();

  const trackSignup = useCallback(() => {
    if (has('measurement')) {
      window.rudderanalytics?.track('Signup Completed', { plan: 'pro' });
    }
  }, [has]);
}
```

From plain JavaScript:

```ts
import { evaluateConsent } from '@c15t/core';

// Reuse the kernel created during initialization.

if (evaluateConsent({ category: 'measurement' }, kernel.getSnapshot())) {
  window.rudderanalytics?.track('Signup Completed', { plan: 'pro' });
}
```

## Types

### RudderStackOptions

|Property|Type|Description|Default|Required|
|:--|:--|:--|:--|:--:|
|writeKey|string|RudderStack source write key.|-|✅ Required|
|dataPlaneUrl|string|RudderStack HTTPS data plane URL.|-|✅ Required|
|consentManagement|RudderStackConsentManagementOptions \|undefined|Opt into RudderStack's pre-consent mode with c15t as the consent&#xA;provider instead of blocking the SDK load until consent.&#xA;&#xA;Defaults to \`undefined\`, which keeps the safe default: the SDK does not&#xA;load until \`measurement\` consent is granted. See&#xA;   for the tradeoffs.|-|Optional|
|loadOptions|JsonObject \|undefined|Optional JSON-serializable RudderStack \`load()\` options.&#xA;&#xA;Values must be JSON-serializable because c15t resolves the manifest into&#xA;script lifecycle callbacks. Do not pass functions, Dates, Maps, Sets,&#xA;class instances, symbols, or other non-JSON values.|-|Optional|
|trackPageView|boolean \|undefined|Queue the initial \`rudderanalytics.page()\` call during setup.|true|Optional|
|scriptUrl|string \|undefined|Optional full loader URL override.|'https\://cdn.rudderlabs.com/v3/modern/rsa.min.js'|Optional|

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
