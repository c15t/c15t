---
title: Microsoft UET
description: Track conversions and measure performance for Microsoft Advertising
  and Bing Ads.
icon: microsoft
group: integrations
---
Microsoft UET (Universal Event Tracking) is Microsoft's conversion tracking tag
for Microsoft Advertising. It tracks user actions, measures campaign
effectiveness, and enables remarketing campaigns.

## Official Microsoft documentation

* [Universal Event Tracking](https://learn.microsoft.com/en-us/advertising/guides/universal-event-tracking?view=bingads-13)
* [UET tag data object](https://learn.microsoft.com/en-us/advertising/campaign-management-service/uettag?view=bingads-13)
* [FAQ: Universal Event Tracking](https://help.ads.microsoft.com/#apex/3/en/53056/2)
* [FAQ: Remarketing](https://help.ads.microsoft.com/#apex/3/en/56727/1)

> 📝 **Note:**
> UET can also load Microsoft Clarity (if enabled in your UET tag settings). Since Clarity is an analytics tool, we recommend loading it separately with measurement consent instead.

## Integrate with c15t

**React**

```tsx
import { hosted } from '@c15t/react';
import { type ReactNode } from 'react';
import { ConsentProvider } from 'c15t/react';
import { microsoftUet } from '@c15t/scripts/microsoft-uet';

const scripts = [microsoftUet({ id: '123456789012345' })];

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
import { microsoftUet } from '@c15t/scripts/microsoft-uet';

const scripts = [microsoftUet({ id: '123456789012345' })];

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
import { microsoftUet } from '@c15t/scripts/microsoft-uet';

const kernel = createConsentKernel({
  transport: createHostedTransport({
    backendURL: 'https://consent.example.com',
  }),
});
const persistence = createPersistence({ kernel });
const loader = createScriptLoader({
  kernel,
  scripts: [microsoftUet({ id: '123456789012345' })],
});
await kernel.commands.init();
// On teardown: loader.dispose(); persistence.dispose(); kernel.dispose();
```

## How c15t loads it

* **Category:** `marketing` (Ads & Pixels)
* **Loads when:** immediately, with Microsoft consent mode enabled
* **Default consent:** c15t pushes `ad_storage: 'denied'` before loading UET unless marketing consent is already granted
* **On grant/revocation:** c15t pushes the new consent state to `uetq` so UET can switch between granted and denied mode without removing the script

Use the UET tag ID as `id`. Microsoft recommends creating one UET tag and
adding it across your site; that tag can then support conversion goals and
remarketing lists.

## Tracking events in your app

c15t loads Microsoft UET in consent mode, so `window.uetq` is created before
consent is granted. Your own event calls are **not** automatically gated. Guard
them if you only want to send custom conversion events after marketing consent
is granted.

Microsoft's custom event syntax uses
`window.uetq.push('event', action, parameters)`. Conversion goals can match page
visits and custom events, and event payloads can include revenue fields such as
`revenue_value` and `currency`.

```tsx
import { useCallback } from 'react';
import { useConsentManager } from 'c15t/react';

function useTrackPurchase() {
  const { has } = useConsentManager();

  return useCallback(() => {
    if (has('marketing')) {
      window.uetq?.push('event', 'purchase', {
        revenue_value: 10,
        currency: 'USD',
      });
    }
  }, [has]);
}

function CheckoutButton() {
  const trackPurchase = useTrackPurchase();

  return (
    <button type="button" onClick={trackPurchase}>
      Complete purchase
    </button>
  );
}
```

## Types

### MicrosoftUetOptions

|Property|Type|Description|Default|Required|
|:--|:--|:--|:--|:--:|
|id|string|Your Microsoft UET ID|-|✅ Required|
|scriptSrc|string \|undefined|Microsoft UET loader URL.|-|Optional|

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
