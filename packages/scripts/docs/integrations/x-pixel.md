---
title: X Pixel (Twitter Pixel)
description: Track conversions and build audiences for advertising campaigns on
  X (formerly Twitter).
icon: x
group: integrations
---
X Pixel (formerly Twitter Pixel) is X's conversion tracking and audience building tool. It helps you measure ad performance, retarget website visitors, and optimize campaigns on the X platform.

## Official X documentation

* [Conversion tracking for websites (X Ads Help)](https://business.x.com/en/help/campaign-measurement-and-analytics/conversion-tracking-for-websites)

## Integrate with c15t

**React**

```tsx
import { hosted } from '@c15t/react';
import { type ReactNode } from 'react';
import { ConsentProvider } from 'c15t/react';
import { xPixel } from '@c15t/scripts/x-pixel';

const scripts = [xPixel({ pixelId: '123456789012345' })];

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
import { xPixel } from '@c15t/scripts/x-pixel';

const scripts = [xPixel({ pixelId: '123456789012345' })];

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
import { xPixel } from '@c15t/scripts/x-pixel';

const kernel = createConsentKernel({
  transport: createHostedTransport({
    backendURL: 'https://consent.example.com',
  }),
});
const persistence = createPersistence({ kernel });
const loader = createScriptLoader({
  kernel,
  scripts: [xPixel({ pixelId: '123456789012345' })],
});
await kernel.commands.init();
// On teardown: loader.dispose(); persistence.dispose(); kernel.dispose();
```

## How c15t loads it

* **Category:** `marketing` (Ads & Pixels)
* **Loads when:** marketing consent is granted
* **On revocation:** unloaded — c15t removes the script element from the DOM

## Configure the integration

You can use the `xPixelEvent` function to track events. This is a wrapper around the `twq` function that the X Pixel script uses.

```ts
import { xPixelEvent } from '@c15t/scripts/x-pixel';

xPixelEvent('tw-xxxx-xxxx', { value: 10.0, currency: 'USD' });
```

## Tracking events in your app

c15t gates the X Pixel script from loading until `marketing` consent is granted. Your application code that calls `twq` or the `xPixelEvent` helper is **not** automatically gated — `window.twq` does not exist before consent is granted, and is removed again if consent is revoked. Unguarded calls throw.

Guard event calls by checking consent state:

```tsx
import { useCallback } from 'react';
import { useConsentManager } from 'c15t/react';
import { xPixelEvent } from '@c15t/scripts/x-pixel';

function useTrackPurchase() {
  const { has } = useConsentManager();
  return useCallback(() => {
    if (has('marketing')) {
      xPixelEvent('tw-xxxx-xxxx', { value: 10.0, currency: 'USD' });
    }
  }, [has]);
}

function PurchaseButton() {
  const trackPurchase = useTrackPurchase();
  return <button onClick={trackPurchase}>Complete purchase</button>;
}
```

## Types

### XPixelOptions

|Property|Type|Description|Default|Required|
|:--|:--|:--|:--|:--:|
|pixelId|string|Your X Pixel ID|-|✅ Required|
|scriptSrc|string \|undefined|X Pixel loader URL.|-|Optional|

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

### XPixelEvent

|Property|Type|Description|Default|Required|
|:--|:--|:--|:--|:--:|
|value|number \|undefined|Total value of the conversion event (ex: $ value of the transaction in case of a purchase, etc.)|-|Optional|
|currency|string \|undefined|Currency of the conversion event&#xA;ISO 4217 code (ex: USD, EUR, JPY, etc.)|-|Optional|
|conversion\_id|string \|undefined|Unique identifier for the event that can be used for deduplication purposes|-|Optional|
|search\_string|string \|undefined|Search string of the conversion event|-|Optional|
|description|string \|undefined|Description of the conversion event|-|Optional|
|twclid|string \|undefined|twclid of the conversion event&#xA;The X Pixel already automatically passes twclid from URL or first-party cookie. This parameter can be optionally used to force attribution to a certain ad click.|-|Optional|
|status|"started" \|"completed" \|undefined|Status of the conversion event&#xA;Should be set to values like "started" or "completed".|-|Optional|
|email\_address|string \|undefined|Email address used for user matching.&#xA;The X Pixel hashes this value before transmission.|-|Optional|
|phone\_number|string \|undefined|Phone number used for user matching.&#xA;Include country code in E.164 format (for example, +11234567890).&#xA;The X Pixel hashes this value before transmission.|-|Optional|
|contents|XPixelContent\[] \|undefined|Content/products associated with the conversion event|-|Optional|

### XPixelContent

|Property|Type|Description|Default|Required|
|:--|:--|:--|:--|:--:|
|content\_type|string \|undefined|Type of the content|-|Optional|
|content\_id|string|ID of the content&#xA;For product catalog users: please pass SKU&#xA;For all other users: Please pass Global Trade Item Number (GTIN) if available, otherwise pass SKU|-|✅ Required|
|content\_name|string \|undefined|Name of a product or service|-|Optional|
|content\_price|number \|undefined|Price of a product or service|-|Optional|
|num\_items|number \|undefined|Quantity of the content|-|Optional|
|content\_group\_id|string \|undefined|ID associated with a group of product variants|-|Optional|
