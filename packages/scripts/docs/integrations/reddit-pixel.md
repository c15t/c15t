---
title: Reddit Pixel
description: Track conversions and build retargeting audiences for Reddit
  advertising campaigns.
group: integrations
icon: reddit
---
Reddit Pixel is Reddit's conversion tracking tool for ads and remarketing. It seeds the standard `rdt` queue before the vendor bundle loads, initializes your pixel, and by default records a `PageVisit` event once consent for `marketing` is available.

## Integrate with c15t

**React**

```tsx
import { hosted } from '@c15t/react';
import { type ReactNode } from 'react';
import { ConsentProvider } from 'c15t/react';
import { redditPixel } from '@c15t/scripts/reddit-pixel';

const scripts = [redditPixel({ pixelId: 't2_abcdef' })];

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
import { redditPixel } from '@c15t/scripts/reddit-pixel';

const scripts = [redditPixel({ pixelId: 't2_abcdef' })];

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
import { redditPixel } from '@c15t/scripts/reddit-pixel';

const kernel = createConsentKernel({
  transport: createHostedTransport({
    backendURL: 'https://consent.example.com',
  }),
});
const persistence = createPersistence({ kernel });
const loader = createScriptLoader({
  kernel,
  scripts: [redditPixel({ pixelId: 't2_abcdef' })],
});
await kernel.commands.init();
// On teardown: loader.dispose(); persistence.dispose(); kernel.dispose();
```

## How c15t loads it

* **Category:** `marketing` (Ads & Pixels)
* **Loads when:** marketing consent is granted
* **On revocation:** retained in the DOM so c15t can call Reddit's
  first-party-cookie controls. c15t calls `rdt('disableFirstPartyCookies')`
  when marketing consent is denied and `rdt('enableFirstPartyCookies')` when
  it is granted again.

If you prefer to control page-view tracking yourself, disable the default `PageVisit` call:

```ts
redditPixel({
  pixelId: 't2_abcdef',
  trackPageVisit: false,
});
```

## Tracking events in your app

c15t gates the Reddit Pixel script from loading until `marketing` consent is granted. Your application code that calls Reddit's runtime API (`window.rdt(...)`) is **not** automatically gated - `window.rdt` does not exist until the script is loaded, so unguarded calls before consent throw.

Guard event calls by checking consent state. From React:

```tsx
import { useCallback } from 'react';
import { useConsentManager } from 'c15t/react';
import { redditPixelEvent } from '@c15t/scripts/reddit-pixel';

function CheckoutExample() {
  const { has } = useConsentManager();

  const trackPurchase = useCallback(() => {
    if (has('marketing')) {
      redditPixelEvent('Purchase', {
        currency: 'USD',
        value: 99,
        conversionId: 'order-123',
      });
    }
  }, [has]);

  // Call trackPurchase() from your conversion success path.
}
```

From plain JavaScript:

```ts
import { evaluateConsent } from '@c15t/core';

// Reuse the kernel created during initialization.

if (evaluateConsent({ category: 'marketing' }, kernel.getSnapshot())) {
  window.rdt?.('track', 'Purchase', {
    currency: 'USD',
    value: 99,
    conversionId: 'order-123',
  });
}
```

When you use Reddit Pixel and Conversions API together, send the same
`conversionId` in the browser event and the server event so Reddit can
deduplicate them.

## Consent and privacy

c15t keeps Reddit Pixel behind `marketing` consent. Before marketing consent,
the Reddit script is not loaded. After marketing consent is granted, c15t loads
the script and queues the Reddit `init` call.

For stricter first-party-cookie behavior, disable Reddit first-party cookies
during initialization:

```ts
redditPixel({
  pixelId: 't2_abcdef',
  disableFirstPartyCookies: true,
});
```

You can also pass Reddit's initialization options directly:

```ts
redditPixel({
  pixelId: 't2_abcdef',
  initOptions: {
    optOut: true,
    disableFirstPartyCookies: true,
  },
});
```

Reddit supports a Limited Data Use flag through data processing fields. Use the
values required by your policy and jurisdiction:

```ts
redditPixel({
  pixelId: 't2_abcdef',
  initOptions: {
    dpm: ['LDU'],
    dpcc: 'US',
    dprc: 'CA',
  },
});
```

Reddit can also receive attribution matching signals such as `email`,
`phoneNumber`, `externalId`, `aaid`, and `idfa`. Only pass those fields after
you have the right consent or legal basis for your use case:

```ts
redditPixel({
  pixelId: 't2_abcdef',
  initOptions: {
    email: 'person@example.com',
    externalId: 'customer-123',
    aam: {
      email: false,
      phone_number: false,
    },
  },
});
```

See Reddit's docs for [Limited Data Use](https://business.reddithelp.com/s/article/Limited-Data-Use),
[event metadata](https://business.reddithelp.com/s/article/about-event-metadata),
and [event deduplication](https://business.reddithelp.com/s/article/event-deduplication).

## Types

### RedditPixelOptions

|Property|Type|Description|Default|Required|
|:--|:--|:--|:--|:--:|
|pixelId|string|Your Reddit Pixel ID.|-|✅ Required|
|trackPageVisit|boolean \|undefined|Queue the standard \`PageVisit\` event during setup.|true|Optional|
|initOptions|RedditPixelInitOptions \|undefined|Optional payload passed as the third argument to \`rdt('init', ...)\`.|-|Optional|
|disableFirstPartyCookies|boolean \|undefined|Disable Reddit first-party cookies during setup.&#xA;&#xA;This is merged into \`initOptions.disableFirstPartyCookies\`.|-|Optional|
|scriptUrl|string \|undefined|Reddit Pixel loader URL.|-|Optional|

### RedditPixelInitOptions

|Property|Type|Description|Default|Required|
|:--|:--|:--|:--|:--:|
|optOut|boolean \|undefined|Opt the user out of Reddit Pixel tracking.&#xA;&#xA;Reddit sends this as \`opt\_out=1\` on pixel requests.|-|Optional|
|disableFirstPartyCookies|boolean \|undefined|Disable Reddit first-party cookies during initialization.|-|Optional|
|email|string \|undefined|Email address or SHA-256 email hash for attribution matching.|-|Optional|
|phoneNumber|string \|undefined|Phone number or SHA-256 phone hash for attribution matching.|-|Optional|
|externalId|string \|undefined|External user identifier or SHA-256 hash for attribution matching.|-|Optional|
|aaid|string \|undefined|Android Advertising ID or SHA-256 hash.|-|Optional|
|idfa|string \|undefined|iOS Identifier for Advertisers or SHA-256 hash.|-|Optional|
|aam|RedditPixelAdvancedMatchingOptions \|undefined|Automatic advanced matching controls.|-|Optional|
|dpm|string \|string\[] \|undefined|Data processing mode, including Reddit Limited Data Use values.|-|Optional|
|dpcc|string \|undefined|Data processing country code.|-|Optional|
|dprc|string \|undefined|Data processing region code.|-|Optional|
|partner|string \|undefined|Integration partner name.|-|Optional|
|partner\_version|string \|undefined|Integration partner version.|-|Optional|
|integration|"reddit" \|"gtm" \|(string & Record\<never, never>) \|undefined|Source integration name reported to Reddit.|-|Optional|
|debug|boolean \|undefined|Enable Reddit Pixel debug logging.|-|Optional|
|useDecimalCurrencyValues|boolean \|undefined|Send monetary \`value\` metadata as \`valueDecimal\`.|true|Optional|

### RedditPixelEventMetadata

|Property|Type|Description|Default|Required|
|:--|:--|:--|:--|:--:|
|itemCount|string \|number \|undefined||-|Optional|
|value|string \|number \|undefined||-|Optional|
|valueDecimal|string \|number \|undefined||-|Optional|
|currency|string \|undefined||-|Optional|
|transactionId|string \|undefined||-|Optional|
|customEventName|string \|undefined||-|Optional|
|products|string \|\{ id?: string \|number \|undefined; name?: string \|undefined; category?: string \|undefined; quantity?: string \|number \|undefined; itemPrice?: string \|number \|undefined; }\[] \|undefined||-|Optional|
|conversionId|string \|undefined|Conversion ID used to deduplicate Pixel events against Conversions API&#xA;events.|-|Optional|

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
