---
title: Google Tag Manager
description: Deploy and manage marketing tags centrally with automatic consent
  state synchronization.
icon: google-tag-manager
group: integrations
---
Google Tag Manager (GTM) is Google's tag management system that lets you deploy and manage marketing tags, analytics scripts, and conversion pixels without modifying your codebase. Instead of hardcoding multiple scripts, you configure them through GTM's web interface.

c15t automatically injects the GTM script into your page and syncs consent state with GTM using Consent Mode v2. GTM manages its own internal consent state and only fires tags when appropriate consent is granted, which means it can safely load before consent is collected.

This prevents GTM-managed scripts from loading without proper consent while giving you centralized control over your marketing stack.

> ℹ️ **Info:**
> Use GTM if your team manages many tags centrally in the GTM UI. Use gtag.js if you only need GA4/Google Ads directly in code. Don't run both for the same destination unless intentional, or you may duplicate events.

## Integrate with c15t

Use your GTM container ID, which begins with `GTM-`.

**React**

```tsx
import { hosted } from '@c15t/react';
import { type ReactNode } from 'react';
import { ConsentProvider } from 'c15t/react';
import { googleTagManager } from '@c15t/scripts/google-tag-manager';

const scripts = [googleTagManager({ id: 'GTM-XXXXXXX' })];

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
import { googleTagManager } from '@c15t/scripts/google-tag-manager';

const scripts = [googleTagManager({ id: 'GTM-XXXXXXX' })];

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
import { googleTagManager } from '@c15t/scripts/google-tag-manager';

const kernel = createConsentKernel({
  transport: createHostedTransport({
    backendURL: 'https://consent.example.com',
  }),
});
const persistence = createPersistence({ kernel });
const loader = createScriptLoader({
  kernel,
  scripts: [googleTagManager({ id: 'GTM-XXXXXXX' })],
});
await kernel.commands.init();
// On teardown: loader.dispose(); persistence.dispose(); kernel.dispose();
```

## How c15t loads it

* **Category:** `necessary` (Tag Managers)
* **Loads when:** [`alwaysLoad`](/docs/frameworks/react/script-loader#always-load) — runs on page start with Consent Mode v2 defaults set to denied
* **On consent change:** c15t pushes a Consent Mode v2 `update` to the data layer; GTM-managed tags re-evaluate against the new state

## Configure the integration

1. **Creating a Tag Manager Container**

   > 📝 Note:
   > This step is optional if you already have a Tag Manager container. Ensure your container has consent overview enabled.

   After signing into Google Tag Manager, you can create a new container.
   Continue to Google Tag Manager

   1. In Tag Manager, click Admin > Container Settings.
   2. Under Additional Settings, select "Enable consent overview".

   Enable consent overview

2. **Custom Update Trigger** We now need to create a custom trigger in GTM to trigger the update event, this is the trigger that is fired when the consent state is updated, e.g. user gives consent to a specific purpose.

   In GTM, you can create a new trigger by clicking on the "Triggers" tab and then clicking on "New".

   For the event name, you can use the default "consent-update", this is customizable later so you can change it if you want.

   Create trigger

3. **Update tags** Now for your existing tags, you can add the "consent-update" trigger to the tag, this will fire the update event when the consent state is updated & it has the appropriate consent state.

   Update tags

## Tracking events in your app

GTM is `alwaysLoad: true`, so the GTM container and `window.dataLayer` are present from page start regardless of consent. Calls like `dataLayer.push({ event: 'signup' })` are **safe at any time** — Consent Mode v2 defaults are set to denied before the user makes a choice, and GTM-managed tags only fire when the matching consent has been granted.

```ts
window.dataLayer = window.dataLayer || [];
window.dataLayer.push({ event: 'signup' });
```

You do not need to wrap `dataLayer.push(...)` in a `useConsentManager().has(...)` check — the consent gate happens inside GTM, not inside c15t.

## Verify setup

1. Open GTM Preview mode and confirm your container (`GTM-...`) loads on page load.
2. Before giving consent, confirm non-essential tags do not fire in GTM Preview.
3. Accept consent in the c15t banner/dialog and confirm a `consent-update` event appears in the GTM event timeline.
4. Confirm measurement/marketing tags fire only after the matching consent is granted.
5. Revoke consent and confirm a new `consent-update` event appears and affected tags stop firing.

## Types

### GoogleTagManagerOptions

|Property|Type|Description|Default|Required|
|:--|:--|:--|:--|:--:|
|id|string|Your Google Tag Manager container ID. Begins with 'GTM-'.|-|✅ Required|
|updateEventName|string \|undefined|Custom event name fired after consent updates.&#xA;Can be used as a trigger in GTM to load scripts once consent is updated.|'consent-update'|Optional|
|consentMapping|Record\<string, string\[]> \|undefined|Custom mapping from c15t consent categories to Google Consent Mode v2 types.&#xA;Overrides the default mapping when provided.|\`\`\`ts&#xA;\{&#xA;  necessary: \['security\_storage'],&#xA;  functionality: \['functionality\_storage'],&#xA;  measurement: \['analytics\_storage'],&#xA;  marketing: \['ad\_storage', 'ad\_user\_data', 'ad\_personalization'],&#xA;  experience: \['personalization\_storage'],&#xA;}&#xA;\`\`\`|Optional|

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
