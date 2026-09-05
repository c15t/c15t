---
title: LinkedIn Insights
description: Track conversions and build matched audiences for LinkedIn
  advertising campaigns.
icon: linkedin
group: integrations
---
LinkedIn Insight Tag is LinkedIn's conversion tracking and audience matching tool for LinkedIn advertising campaigns. It tracks website actions, measures ad performance, builds website retargeting audiences, and provides aggregate audience insights about visitors from LinkedIn member accounts.

## Official LinkedIn documentation

* [Add the LinkedIn Insight Tag to your website](https://www.linkedin.com/help/lms/answer/a418880)
* [LinkedIn Insight Tag overview](https://www.linkedin.com/help/lms/answer/a489169)
* [LinkedIn Insight Tag FAQs](https://www.linkedin.com/help/lms/answer/a427660)
* [Insight Tag source status](https://www.linkedin.com/help/lms/answer/a488323)
* [Compatible tag management systems](https://www.linkedin.com/help/lms/answer/a422760)
* [LinkedIn Ads Agreement](https://www.linkedin.com/legal/sas-terms)

## Integrate with c15t

**React**

```tsx
import { hosted } from '@c15t/react';
import { type ReactNode } from 'react';
import { ConsentProvider } from 'c15t/react';
import { linkedinInsights } from '@c15t/scripts/linkedin-insights';

const scripts = [
  linkedinInsights({
    id: '123456789012345',
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
import { linkedinInsights } from '@c15t/scripts/linkedin-insights';

const scripts = [
  linkedinInsights({
    id: '123456789012345',
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
import { linkedinInsights } from '@c15t/scripts/linkedin-insights';

const kernel = createConsentKernel({
  transport: createHostedTransport({
    backendURL: 'https://consent.example.com',
  }),
});
const persistence = createPersistence({ kernel });
const loader = createScriptLoader({
  kernel,
  scripts: [
    linkedinInsights({
      id: '123456789012345',
    }),
  ],
});
await kernel.commands.init();
// On teardown: loader.dispose(); persistence.dispose(); kernel.dispose();
```

## How c15t loads it

* **Category:** `marketing` (Ads & Pixels)
* **Loads when:** marketing consent is granted
* **Default install:** c15t sets the LinkedIn partner ID globals, seeds the `lintrk` queue, and loads LinkedIn's `insight.min.js`
* **On revocation:** unloaded - c15t removes the script element from the DOM

> ⚠️ **Warning:**
> LinkedIn says the Insight Tag should not be installed on pages that collect or contain Sensitive Data, including certain consumer health or financial pages. If your app has those pages, only include this script on eligible routes and confirm the placement with your legal team.

Use the LinkedIn Insight Tag partner ID as `id`. You can find it in Campaign Manager under **Data** -> **Signals manager** -> **Insight Tag**.

c15t intentionally does not add LinkedIn's `<noscript>` image pixel fallback. The integration is consent-gated JavaScript, so the script only loads after `marketing` consent is granted.

## Tracking events in your app

c15t gates the LinkedIn Insight Tag from loading until `marketing` consent is granted. Page tracking is automatic once the script loads, but if you fire custom conversions through `window.lintrk(...)`, those calls are **not** automatically gated - `window.lintrk` does not exist before consent is granted, and is removed again if consent is revoked.

Guard custom conversion calls by checking consent state:

```tsx
import { useCallback } from 'react';
import { useConsentManager } from 'c15t/react';

function useTrackSignup() {
  const { has } = useConsentManager();
  return useCallback(() => {
    if (has('marketing')) {
      window.lintrk?.('track', { conversion_id: 12345 });
    }
  }, [has]);
}

function SignupButton() {
  const trackSignup = useTrackSignup();
  return <button onClick={trackSignup}>Sign up</button>;
}
```

## Verify setup

LinkedIn validates the tag after an associated domain or URL receives traffic. Source status can take a few minutes and up to 24 hours to update after the first page load:

* **Active:** signal received in the past seven days
* **No recent activity:** no signal for more than seven days
* **Unverified:** no signal received yet

## Types

### LinkedInInsightsOptions

|Property|Type|Description|Default|Required|
|:--|:--|:--|:--|:--:|
|id|string|Your LinkedIn Insight Tag partner ID.&#xA;&#xA;LinkedIn shows this in Campaign Manager under Data -> Signals manager ->&#xA;Insight Tag.|-|✅ Required|
|scriptSrc|string \|undefined|LinkedIn Insight Tag loader URL.|-|Optional|

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
