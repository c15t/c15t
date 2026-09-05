---
title: Meta Pixel
description: Track conversions and build audiences for Facebook and Instagram
  advertising campaigns.
icon: meta
group: integrations
---
Meta Pixel (formerly Facebook Pixel) is Meta's conversion tracking and audience targeting tool for Facebook and Instagram advertising. It tracks user actions, measures ad effectiveness, builds custom audiences, and optimizes ad delivery.

## Integrate with c15t

**React**

```tsx
import { hosted } from '@c15t/react';
import { type ReactNode } from 'react';
import { ConsentProvider } from 'c15t/react';
import { metaPixel } from '@c15t/scripts/meta-pixel';

const scripts = [
  metaPixel({
    pixelId: '123456789012345',
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
import { metaPixel } from '@c15t/scripts/meta-pixel';

const scripts = [
  metaPixel({
    pixelId: '123456789012345',
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
import { metaPixel } from '@c15t/scripts/meta-pixel';

const kernel = createConsentKernel({
  transport: createHostedTransport({
    backendURL: 'https://consent.example.com',
  }),
});
const persistence = createPersistence({ kernel });
const loader = createScriptLoader({
  kernel,
  scripts: [
    metaPixel({
      pixelId: '123456789012345',
    }),
  ],
});
await kernel.commands.init();
// On teardown: loader.dispose(); persistence.dispose(); kernel.dispose();
```

## How c15t loads it

* **Category:** `marketing` (Ads & Pixels)
* **Loads when:** marketing consent is granted
* **Default install:** c15t queues `fbq('consent', 'grant')`, `fbq('init', pixelId)`, `fbq('track', 'PageView')`, then loads Meta's `fbevents.js`
* **On revocation:** [persists](/docs/frameworks/react/script-loader#persist-after-revocation) — c15t calls `fbq('consent', 'revoke')` so Meta stops tracking without removing the script

Meta recommends installing the base pixel on every page you want to measure. c15t injects scripts into the document head by default, which matches Meta's recommendation to load the pixel early.

## Configure the integration

Use the default setup when you want Meta's standard `PageView` event to fire as soon as the pixel loads after marketing consent.

```ts
metaPixel({
  pixelId: '123456789012345',
});
```

For single-page applications, disable the automatic `PageView` and track route changes yourself.

```ts
metaPixel({
  pixelId: '123456789012345',
  trackPageView: false,
});
```

You can pass optional init data as the third argument to `fbq('init', ...)`.

```ts
metaPixel({
  pixelId: '123456789012345',
  initOptions: {
    external_id: 'customer-123',
  },
});
```

## Tracking events in your app

c15t gates the Meta Pixel script from loading until `marketing` consent is
granted. After consent is granted the script stays in the DOM, and c15t calls
`fbq('consent', 'revoke')` if consent is later revoked so Meta stops tracking
without removing the script.

This means `window.fbq` and the `metaPixelEvent` helpers are only defined after
the user has granted marketing consent at least once. Before that, unguarded
calls throw.

### Standard events

Use `metaPixelEvent` to track Meta standard events. It is a typed wrapper around `fbq('track', ...)`.

Meta documents standard event tracking in its [conversion tracking guide](https://developers.facebook.com/docs/meta-pixel/implementation/conversion-tracking) and [Marketing API pixel examples](https://developers.facebook.com/docs/meta-pixel/implementation/marketing-api).

```ts
import { metaPixelEvent } from '@c15t/scripts/meta-pixel';

metaPixelEvent('Lead', {
  value: 40,
  currency: 'USD',
});

metaPixelEvent('AddToCart', {
  content_ids: ['SKU-123'],
  content_type: 'product',
  value: 49.99,
  currency: 'USD',
});

metaPixelEvent(
  'Purchase',
  {
    contents: [
      { id: 'SKU-123', quantity: 2 },
      { id: 'SKU-456', quantity: 1 },
    ],
    content_type: 'product',
    value: 149.97,
    currency: 'USD',
  },
  'browser-event-123'
);
```

The optional third argument can be an event ID string or an options object. c15t forwards string IDs as `{ eventID: '...' }`, which is the browser-side format used for Conversions API deduplication.

```ts
metaPixelEvent(
  'Purchase',
  { value: 149.97, currency: 'USD' },
  { eventID: 'browser-event-123' }
);
```

### Custom events

Use `metaPixelCustomEvent` when Meta's standard events do not fit the action you are measuring. Meta custom event names must be strings and cannot exceed 50 characters.

```ts
import { metaPixelCustomEvent } from '@c15t/scripts/meta-pixel';

metaPixelCustomEvent('ShareDiscount', {
  promotion: 'share_discount_10%',
});
```

Custom events can also use an event ID for Conversions API deduplication.

```ts
metaPixelCustomEvent(
  'ShareDiscount',
  { promotion: 'share_discount_10%' },
  'browser-event-456'
);
```

### Guard event calls with consent

The example below intentionally uses `useConsentManager().has('marketing')` as
a defensive policy so your app avoids calling `metaPixelEvent` whenever consent
is currently revoked, even though Meta also suppresses tracking after initial
load.

```tsx
import { useConsentManager } from 'c15t/react';
import { metaPixelEvent } from '@c15t/scripts/meta-pixel';

function useTrackPurchase() {
  const { has } = useConsentManager();

  // Defensive pattern: only call metaPixelEvent while marketing consent is granted.
  return () => {
    if (has('marketing')) {
      metaPixelEvent('Purchase', { value: 10.0, currency: 'USD' });
    }
  };
}

function PurchaseButton() {
  const trackPurchase = useTrackPurchase();

  return <button onClick={trackPurchase}>Complete purchase</button>;
}
```

### SPA route changes

Meta's [SPA guidance](https://developers.facebook.com/docs/facebook-pixel/implementation/tag_spa) recommends tracking meaningful URL changes from your router. Disable the install-time `PageView`, then emit page views after navigation while marketing consent is granted.

```tsx
import { useConsentManager } from 'c15t/react';
import { metaPixelEvent } from '@c15t/scripts/meta-pixel';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function MetaRouteTracking() {
  const { has } = useConsentManager();
  const location = useLocation();

  useEffect(() => {
    if (has('marketing')) {
      metaPixelEvent('PageView');
    }
  }, [has, location.pathname, location.search]);

  return null;
}
```

## Consent and privacy

Meta's GDPR guidance documents `fbq('consent', 'revoke')` and `fbq('consent', 'grant')`. c15t handles those calls for you after the script has loaded once:

* Before marketing consent, c15t does not load Meta Pixel.
* When marketing consent is granted, c15t loads Meta Pixel and calls `fbq('consent', 'grant')`.
* When marketing consent is revoked later, c15t keeps the script in place and calls `fbq('consent', 'revoke')`.

For US state privacy rules, Meta supports [Data Processing Options](https://developers.facebook.com/docs/meta-pixel/implementation/data-processing-options). Pass `dataProcessingOptions` to queue `fbq('dataProcessingOptions', ...)` before `fbq('init', ...)`.

Let Meta geolocate Limited Data Use:

```ts
metaPixel({
  pixelId: '123456789012345',
  dataProcessingOptions: {
    options: ['LDU'],
    country: 0,
    state: 0,
  },
});
```

Enable Limited Data Use for California:

```ts
metaPixel({
  pixelId: '123456789012345',
  dataProcessingOptions: {
    options: ['LDU'],
    country: 1,
    state: 1000,
  },
});
```

Explicitly disable Limited Data Use:

```ts
metaPixel({
  pixelId: '123456789012345',
  dataProcessingOptions: {
    options: [],
  },
});
```

## Catalog and collaborative ads

For Advantage+ catalog ads, Meta requires `ViewContent`, `AddToCart`, and `Purchase` events to include either `content_ids` or `contents`. IDs must match your product catalog. See Meta's [Advantage+ catalog ads guide](https://developers.facebook.com/docs/meta-pixel/get-started/advantage-catalog-ads).

```ts
metaPixelEvent('ViewContent', {
  content_ids: ['SKU-123'],
  content_type: 'product',
  value: 49.99,
  currency: 'USD',
});
```

For collaborative ads, Meta requires `content_type: 'product'`; `AddToCart` and `Purchase` also require `contents`, `currency`, and `value`. See Meta's [collaborative ads pixel guide](https://developers.facebook.com/docs/meta-pixel/implementation/pixel-for-collaborative-ads).

```ts
metaPixelEvent('AddToCart', {
  contents: [{ id: 'SKU-123', quantity: 2 }],
  content_type: 'product',
  value: 99.98,
  currency: 'USD',
});
```

## Movies

Meta's [movies pixel guide](https://developers.facebook.com/docs/meta-pixel/implementation/pixel-for-movies) uses the standard events `ViewContent`, `InitiateCheckout`, `Purchase`, and `PageView` with movie-specific parameters such as `movieref`.

```ts
metaPixelEvent('InitiateCheckout', {
  content_ids: ['movie-1|theater-1|2026-05-11T19:30:00-07:00'],
  movieref: 'fb_movies',
  num_items: 2,
});
```

## Multiple pixels

Meta's [multiple pixel guidance](https://developers.facebook.com/docs/facebook-pixel/implementation/accurate_event_tracking) warns that `fbq('track', ...)` and `fbq('trackCustom', ...)` fire for every initialized pixel ID. If another integration or tag manager initializes more than one pixel, use the single-pixel helpers to prevent overfiring.

```ts
import {
  metaPixelSingleCustomEvent,
  metaPixelSingleEvent,
} from '@c15t/scripts/meta-pixel';

metaPixelSingleEvent('PIXEL-A', 'Purchase', {
  value: 149.97,
  currency: 'USD',
});

metaPixelSingleCustomEvent('PIXEL-B', 'Step4', {
  funnel: 'checkout',
});
```

## Custom audiences and sharing

Meta custom audiences are configured in Events Manager after standard events, custom events, or custom conversions are being received. The c15t integration sends the browser events; audience rules are managed in Meta. See Meta's [custom audiences guide](https://developers.facebook.com/docs/facebook-pixel/implementation/custom-audiences).

Pixel sharing between businesses or agencies is also managed through Meta Business Manager or the Business Management APIs, not through the browser script. See Meta's [pixel sharing guide](https://developers.facebook.com/docs/marketing-api/business-asset-management/guides/business-pixel-sharing).

## Types

### MetaPixelOptions

|Property|Type|Description|Default|Required|
|:--|:--|:--|:--|:--:|
|pixelId|string|Your Meta Pixel ID|-|✅ Required|
|initOptions|Record\<string, unknown> \|undefined|Optional payload passed as the third argument to \`fbq('init', ...)\`.|-|Optional|
|trackPageView|boolean \|undefined|Queue the default \`PageView\` event during setup.|true|Optional|
|dataProcessingOptions|MetaPixelDataProcessingOptions \|undefined|Optional Meta data processing options, such as Limited Data Use.&#xA;&#xA;When provided, c15t queues \`fbq('dataProcessingOptions', ...)\` before&#xA;\`fbq('init', ...)\`.|-|Optional|
|scriptSrc|string \|undefined|Meta Pixel loader URL.|-|Optional|

### MetaPixelDataProcessingOptions

|Property|Type|Description|Default|Required|
|:--|:--|:--|:--|:--:|
|options|"LDU"\[] \|\[]|Data processing flags sent to Meta before \`init\`.&#xA;&#xA;Use \`\['LDU']\` to enable Limited Data Use, or \`\[]\` to explicitly disable it.|-|✅ Required|
|country|number \|undefined|Meta country code. Use \`0\` to let Meta geolocate the event or \`1\` for USA.|-|Optional|
|state|number \|undefined|Meta state code. Use \`0\` to let Meta geolocate the event.|-|Optional|

### MetaPixelEventOptions

|Property|Type|Description|Default|Required|
|:--|:--|:--|:--|:--:|
|eventID|string \|undefined|Event ID used to deduplicate browser events against Conversions API events.|-|Optional|

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

### StandardEventParams

|Property|Type|Description|Default|Required|
|:--|:--|:--|:--|:--:|
|AddPaymentInfo|AddPaymentInfoParams||-|✅ Required|
|AddToCart|AddToCartParams||-|✅ Required|
|AddToWishlist|AddToWishlistParams||-|✅ Required|
|CompleteRegistration|CompleteRegistrationParams||-|✅ Required|
|Contact|ContactParams||-|✅ Required|
|CustomizeProduct|CustomizeProductParams||-|✅ Required|
|Donate|DonateParams||-|✅ Required|
|FindLocation|FindLocationParams||-|✅ Required|
|InitiateCheckout|InitiateCheckoutParams||-|✅ Required|
|Lead|LeadParams||-|✅ Required|
|PageView|FbqCustomParams||-|✅ Required|
|Purchase|PurchaseParams||-|✅ Required|
|Schedule|ScheduleParams||-|✅ Required|
|Search|SearchParams||-|✅ Required|
|StartTrial|StartTrialParams||-|✅ Required|
|SubmitApplication|SubmitApplicationParams||-|✅ Required|
|Subscribe|SubscribeParams||-|✅ Required|
|ViewContent|ViewContentParams||-|✅ Required|
