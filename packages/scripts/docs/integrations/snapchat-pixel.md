---
title: Snapchat Pixel
description: Measure Snapchat ad performance and build remarketing audiences
  with a prebuilt pixel helper.
group: integrations
icon: snapchat
---
Snapchat Pixel is Snapchat's website conversion tracking and audience-building tool. The `snapchatPixel()` helper seeds the `snaptr` queue, initializes your pixel, and by default tracks a `PAGE_VIEW` event as soon as `marketing` consent is available.

## Integrate with c15t

**React**

```tsx
import { hosted } from '@c15t/react';
import { type ReactNode } from 'react';
import { ConsentProvider } from 'c15t/react';
import { snapchatPixel } from '@c15t/scripts/snapchat-pixel';

const scripts = [snapchatPixel({ pixelId: '123456789012345' })];

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
import { snapchatPixel } from '@c15t/scripts/snapchat-pixel';

const scripts = [snapchatPixel({ pixelId: '123456789012345' })];

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
import { snapchatPixel } from '@c15t/scripts/snapchat-pixel';

const kernel = createConsentKernel({
  transport: createHostedTransport({
    backendURL: 'https://consent.example.com',
  }),
});
const persistence = createPersistence({ kernel });
const loader = createScriptLoader({
  kernel,
  scripts: [snapchatPixel({ pixelId: '123456789012345' })],
});
await kernel.commands.init();
// On teardown: loader.dispose(); persistence.dispose(); kernel.dispose();
```

## How c15t loads it

* **Category:** `marketing` (Ads & Pixels)
* **Loads when:** marketing consent is granted
* **On revocation:** unloaded - c15t removes the script from the DOM, so app code should guard `snaptr(...)` calls until consent is granted again.

You can pass extra init payload and disable the default page-view event when you need finer control:

```ts
snapchatPixel({
  pixelId: '123456789012345',
  initOptions: {
    user_email: 'hello@example.com',
  },
  trackPageView: false,
});
```

## Tracking events in your app

c15t gates the Snapchat Pixel script from loading until `marketing` consent is granted. Your application code that calls Snapchat's runtime API (`window.snaptr(...)`) is **not** automatically gated - `window.snaptr` does not exist until the script is loaded, so unguarded calls before consent throw.

Use `snapchatPixelEvent()` for typed standard and custom event tracking. Guard
event calls by checking consent state. From React:

```tsx
import { useCallback } from 'react';
import { useConsentManager } from 'c15t/react';
import { snapchatPixelEvent } from '@c15t/scripts/snapchat-pixel';

function CheckoutExample() {
  const { has } = useConsentManager();

  const trackPurchase = useCallback(() => {
    if (has('marketing')) {
      snapchatPixelEvent('PURCHASE', {
        price: 99,
        currency: 'USD',
        transaction_id: 'order-123',
        client_dedup_id: 'event-123',
      });
    }
  }, [has]);

  // Call trackPurchase() from your conversion success path.
}
```

From plain JavaScript:

```ts
import { evaluateConsent } from '@c15t/core';
import { snapchatPixelEvent } from '@c15t/scripts/snapchat-pixel';

// Reuse the kernel created during initialization.

if (evaluateConsent({ category: 'marketing' }, kernel.getSnapshot())) {
  snapchatPixelEvent('PURCHASE', { price: 99, currency: 'USD' });
}
```

## Types

### SnapchatPixelOptions

|Property|Type|Description|Default|Required|
|:--|:--|:--|:--|:--:|
|pixelId|string|Your Snapchat Pixel ID.|-|✅ Required|
|initOptions|Record\<string, unknown> \|undefined|Optional init payload passed to \`snaptr('init', ...)\`.|-|Optional|
|trackPageView|boolean \|undefined|Queue the default \`PAGE\_VIEW\` event during setup.|true|Optional|
|scriptUrl|string \|undefined|Snapchat Pixel loader URL.|-|Optional|

### SnapchatPixelEventProperties

|Property|Type|Description|Default|Required|
|:--|:--|:--|:--|:--:|
|price|number \|undefined|Total monetary value for commerce events such as \`PURCHASE\`.|-|Optional|
|client\_dedup\_id|string \|undefined|Event identifier used to deduplicate browser Pixel events against&#xA;server-side Conversions API events.|-|Optional|
|currency|string \|undefined|ISO 4217 currency code, for example \`USD\`.|-|Optional|
|transaction\_id|string \|undefined|Transaction/order identifier for purchase events.|-|Optional|
|item\_ids|string\[] \|undefined|Product, SKU, or content identifiers associated with the event.|-|Optional|
|item\_category|string \|undefined|Product or content category associated with the event.|-|Optional|
|description|string \|undefined|Free-form description for the event.|-|Optional|
|search\_string|string \|undefined|Query text for \`SEARCH\` events.|-|Optional|
|number\_items|number \|undefined|Number of items represented by the event.|-|Optional|
|payment\_info\_available|0 \|1 \|undefined|Whether payment information was available, represented as \`0\` or \`1\`.|-|Optional|
|sign\_up\_method|string \|undefined|Signup method for \`SIGN\_UP\` events.|-|Optional|
|success|0 \|1 \|undefined|Whether the action succeeded, represented as \`0\` or \`1\`.|-|Optional|
|brands|string\[] \|undefined|Brand names associated with the event contents.|-|Optional|
|delivery\_method|"in\_store" \|"curbside" \|"delivery" \|undefined|Fulfillment method for commerce events.|-|Optional|
|customer\_status|"new" \|"returning" \|"reactivated" \|undefined|Customer lifecycle status associated with the event.|-|Optional|
|event\_tag|string \|undefined|Optional custom tag for event segmentation in Snapchat.|-|Optional|

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
