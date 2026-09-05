---
title: Adobe Analytics
description: Adobe Analytics loaded through an Adobe Experience Platform Data
  Collection Tags embed URL.
group: integrations
icon: adobe-analytics
---
[Adobe Analytics](https://business.adobe.com/products/analytics/adobe-analytics.html) is commonly deployed through an Adobe Experience Platform Data Collection web property. Data Collection generates a property-specific Tags embed script, often hosted on `assets.adobedtm.com`, and that script can load Adobe Analytics, Web SDK, or other configured extensions and rules.

## Integrate with c15t

**React**

```tsx
import { hosted } from '@c15t/react';
import { type ReactNode } from 'react';
import { ConsentProvider } from 'c15t/react';
import { adobeAnalytics } from '@c15t/scripts/adobe-analytics';

const scripts = [
  adobeAnalytics({
    scriptUrl:
      'https://assets.adobedtm.com/YOUR_ORG/YOUR_PROPERTY/launch-production.min.js',
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
import { adobeAnalytics } from '@c15t/scripts/adobe-analytics';

const scripts = [
  adobeAnalytics({
    scriptUrl:
      'https://assets.adobedtm.com/YOUR_ORG/YOUR_PROPERTY/launch-production.min.js',
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
import { adobeAnalytics } from '@c15t/scripts/adobe-analytics';

const kernel = createConsentKernel({
  transport: createHostedTransport({
    backendURL: 'https://consent.example.com',
  }),
});
const persistence = createPersistence({ kernel });
const loader = createScriptLoader({
  kernel,
  scripts: [
    adobeAnalytics({
      scriptUrl:
        'https://assets.adobedtm.com/YOUR_ORG/YOUR_PROPERTY/launch-production.min.js',
    }),
  ],
});
await kernel.commands.init();
// On teardown: loader.dispose(); persistence.dispose(); kernel.dispose();
```

## Find Your Embed URL

Open Adobe Data Collection, choose your Tags property, then open **Environments**. Select the install action for the environment you want to deploy and copy the web property embed script URL from the generated code.

Each Adobe environment has its own embed code. Use the production URL in production, and keep development or staging URLs limited to test environments. The URL is typically shaped like:

```txt
https://assets.adobedtm.com/{org}/{property}/launch-{env}.min.js
```

Self-hosted Data Collection builds are supported too. c15t only requires a full `https:` URL.

## How c15t loads it

* **Category:** `measurement` (Analytics)
* **Loads when:** measurement consent is granted
* **On revocation:** unloaded - c15t removes the Adobe Tags script element from the DOM.

The helper blocks the Adobe Tags library until measurement consent is granted. When measurement consent is revoked, c15t unloads the script element. Adobe rules, extensions, cookies, and downstream tags that already ran may have their own state, so configure Data Collection rules and extensions to respect your consent model as well.

This is the same caveat as tag managers: a Tags property can load more than Adobe Analytics. Keep non-measurement tags behind Adobe-side rule conditions, consent checks, or separate properties so they do not run from a measurement-only grant.

By default, c15t also seeds the Adobe Client Data Layer queue before loading:

```ts
adobeAnalytics({
  scriptUrl:
    'https://assets.adobedtm.com/YOUR_ORG/YOUR_PROPERTY/launch-production.min.js',
  seedAdobeDataLayer: true,
});
```

This creates `window.adobeDataLayer = []` only when it is still undefined. Adobe's Client Data Layer extension uses `adobeDataLayer` as the default object name, and the pre-seed is harmless for properties that do not use that extension.

Adobe's `_satellite` object becomes available after the Tags library loads:

```ts
if (window._satellite) {
  // Adobe Tags runtime is available.
}
```

Use synchronous deployment only when a legacy Tags setup requires it:

```ts
adobeAnalytics({
  scriptUrl:
    'https://assets.adobedtm.com/YOUR_ORG/YOUR_PROPERTY/launch-production.min.js',
  async: false,
});
```

## Types

### AdobeAnalyticsOptions

|Property|Type|Description|Default|Required|
|:--|:--|:--|:--|:--:|
|scriptUrl|string|Adobe Experience Platform Data Collection web property embed URL.&#xA;&#xA;This must be the full \`https:\` URL from your Adobe Tags environment embed&#xA;code, commonly shaped like&#xA;\`https\://assets.adobedtm.com/\{org}/\{property}/launch-\{env}.min.js\`.&#xA;Self-hosted Launch/Tags embeds are supported as long as they use \`https:\`.|-|✅ Required|
|async|boolean \|undefined|Load the Adobe Tags library asynchronously.&#xA;&#xA;Adobe recommends asynchronous deployment for most web properties. Set this&#xA;to \`false\` only for legacy synchronous setups that require ordered blocking&#xA;behavior.|true|Optional|
|seedAdobeDataLayer|boolean \|undefined|Seed the Adobe Client Data Layer queue before the Tags library loads.&#xA;&#xA;When enabled, c15t creates \`window\.adobeDataLayer = \[]\` only when the&#xA;global is still undefined. This matches Adobe Client Data Layer's default&#xA;object name and is harmless for properties that do not use the extension.|true|Optional|

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
