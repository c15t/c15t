---
title: GA4 + Google Ads (gtag.js)
description: Send data to Google Analytics 4 and Google Ads with automatic
  Consent Mode v2 support.
icon: google-analytics
group: integrations
---
Google Tag (`gtag.js`) is Google's unified tracking script for sending data to Google Analytics 4 (GA4), Google Ads, and Floodlight. It measures user behavior, tracks conversions, and powers Google's advertising ecosystem.

c15t initializes Google Tag with Consent Mode v2 defaults set to denied and automatically updates the consent state when users make choices. You don't need to configure Google Consent Mode yourself.

> ℹ️ **Info:**
> Use GTM if your team needs centralized tag management in the GTM UI. Use gtag.js if you only need GA4/Google Ads directly in code. Don't run both for the same destination unless intentional, or you may duplicate events.

**Choosing the right category:**

* Use `category: 'measurement'` for analytics-only tracking (GA4 events)
* Use `category: 'marketing'` for advertising and conversion tracking (Google Ads)

## Integrate with c15t

**React**

```tsx
import { hosted } from '@c15t/react';
import { type ReactNode } from 'react';
import { ConsentProvider } from 'c15t/react';
import { gtag } from '@c15t/scripts/google-tag';

const scripts = [
  gtag({
    id: 'G-XXXXXXXXXX',
    category: 'measurement', // or 'marketing'
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
import { gtag } from '@c15t/scripts/google-tag';

const scripts = [
  gtag({
    id: 'G-XXXXXXXXXX',
    category: 'measurement', // or 'marketing'
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
import { gtag } from '@c15t/scripts/google-tag';

const kernel = createConsentKernel({
  transport: createHostedTransport({
    backendURL: 'https://consent.example.com',
  }),
});
const persistence = createPersistence({ kernel });
const loader = createScriptLoader({
  kernel,
  scripts: [
    gtag({
      id: 'G-XXXXXXXXXX',
      category: 'measurement', // or 'marketing'
    }),
  ],
});
await kernel.commands.init();
// On teardown: loader.dispose(); persistence.dispose(); kernel.dispose();
```

## How c15t loads it

* **Category:** configurable — `measurement` (default, Analytics) or `marketing`
* **Loads when:** [`alwaysLoad`](/docs/frameworks/react/script-loader#always-load) — runs on page start regardless of consent state, with Consent Mode v2 defaults set to denied
* **On consent change:** [persists](/docs/frameworks/react/script-loader#persist-after-revocation) — c15t pushes a Consent Mode v2 `update` to gtag instead of removing the script

## Tracking events in your app

`gtag.js` is `alwaysLoad: true`, so `window.gtag` is present from page start regardless of consent. Calls like `gtag('event', 'sign_up')` are **safe at any time** — c15t sets Consent Mode v2 defaults to denied before the user makes a choice, and Google's SDK suppresses transmission of events while the relevant consent is denied. When consent later changes, c15t emits a Consent Mode v2 `update` so events fire correctly going forward.

```ts
window.gtag?.('event', 'sign_up', { method: 'email' });
```

You do not need to wrap `gtag(...)` calls in a `useConsentManager().has(...)` check — Consent Mode handles the suppression for you.

## Types

### GtagOptions

|Property|Type|Description|Default|Required|
|:--|:--|:--|:--|:--:|
|id|string|Your gtag id|-|✅ Required|
|category|AllConsentNames|The consent category to use for the gtag script. This is typically marketing (Ads & Floodlight) or measurement (Analytics)|-|✅ Required|
|consentMapping|Record\<string, string\[]> \|undefined|Custom mapping from c15t consent categories to Google Consent Mode v2 types.&#xA;Overrides the default mapping when provided.|\`\`\`ts&#xA;\{&#xA;  necessary: \['security\_storage'],&#xA;  functionality: \['functionality\_storage'],&#xA;  measurement: \['analytics\_storage'],&#xA;  marketing: \['ad\_storage', 'ad\_user\_data', 'ad\_personalization'],&#xA;  experience: \['personalization\_storage'],&#xA;}&#xA;\`\`\`|Optional|
|script|Partial\<Script> \|undefined|Deprecated script-level overrides preserved for backwards compatibility.&#xA;&#xA;Prefer manifest-backed options instead of this generic override bag.|-|Optional|

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
