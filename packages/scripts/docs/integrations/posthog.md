---
title: PostHog
description: PostHog is an open-source product analytics platform for tracking
  user behavior, session replays, feature flags, and A/B testing. It supports
  cookieless tracking, allowing analytics to continue even without cookie
  consent.
icon: posthog
group: integrations
---
PostHog is an open-source product analytics platform that helps you understand user behavior, track events, and analyze product usage. Unlike traditional analytics tools, PostHog supports both cookieless and cookie-based tracking. This means you can sync c15t with PostHog and, when your PostHog project is configured for cookieless tracking, continue collecting privacy-preserving analytics after a user rejects measurement consent.

c15t exposes two integration patterns for PostHog. Pick the one that matches how you already load the SDK:

* **PostHog SDK** — your app loads `posthog-js` itself; c15t only synchronizes consent. Recommended for most React apps.
* **PostHog Script** — c15t loads PostHog's array bootstrap as a managed `Script`.

## Integrate with c15t

### SDK pattern

This is the recommended approach if you're using the PostHog JS SDK; it's commonly used in React projects.

1. **Enable cookieless tracking in PostHog** Before using `cookieless_mode`, enable **Cookieless server hash mode** in your PostHog project under **Project Settings** > **Web analytics**. PostHog ignores cookieless events unless this project setting is enabled.

2. **Initialize PostHog** When you initialize PostHog, set `cookieless_mode` to `on_reject`. This keeps PostHog from writing cookies or local/session storage until the user grants measurement consent. If the user rejects measurement consent, c15t calls `opt_out_capturing()` and PostHog switches to cookieless capture.

   ```ts
   posthog.init('phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', {
     api_host: 'https://eu.i.posthog.com',
     defaults: '2026-01-30',
     cookieless_mode: 'on_reject',
   });

   posthog.opt_out_capturing(); // Avoids cookie-based capture until c15t syncs consent
   ```

3. **Sync settled consent once, then subscribe to real changes** The recommended PostHog SDK approach uses two phases: run one initial sync after c15t has finished resolving consent, then subscribe to effective permission changes with `permissions:changed`.

   With cookieless\_mode: 'on\_reject', denied measurement consent does not mean "no events." It means PostHog records cookieless events without browser persistence. If your product needs denied consent to stop all PostHog event capture, do not use cookieless mode; load or call PostHog only after consent is granted.

   > ⚠️ Warning:
   > Do not use posthog.has\_opted\_in\_capturing() or posthog.has\_opted\_out\_capturing() to decide whether to show your banner. In recent PostHog versions, has\_opted\_in\_capturing() can return true when consent is still pending. Use c15t's consent store as the source of truth, or use PostHog's get\_explicit\_consent\_status() when you specifically need PostHog's stored consent state.
   >
   > ℹ️ Info:
   > To wrap this in your framework, pass the callbacks option to your ConsentProvider the same way you would pass scripts — see the JavaScript, React, or Next.js script loader guide.

   ```ts
   import { evaluateConsent } from '@c15t/core';
   import posthog from 'posthog-js';

   // Reuse the kernel initialized for this page.
   function syncPostHog() {
     if (evaluateConsent({ category: 'measurement' }, kernel.getSnapshot())) {
       posthog.opt_in_capturing();
     } else {
       posthog.opt_out_capturing();
     }
   }
   syncPostHog();
   const stop = kernel.events.on('permissions:changed', syncPostHog);
   // Call stop() during teardown.
   ```

   > ℹ️ Info:
   > Use onPermissionsChanged in framework providers so expiry, GPC and policy changes reach the SDK even without a new choice.

### Script helper pattern

If you want to load PostHog via a script tag, it's recommended to use this approach.

1. **Choose a region and loading mode** The c15t helper loads PostHog's bootstrap script, calls `posthog.init()` for you, and then synchronizes consent through `posthog.opt_in_capturing()` / `posthog.opt_out_capturing()`. You do not need to call `posthog.init()` separately.

   Use region to keep PostHog's API, UI, and bootstrap script hosts aligned. c15t defaults to region: 'eu'; set region: 'us' for PostHog Cloud US. You can still pass apiHost, uiHost, or scriptUrl for self-hosted or proxied setups.

   The helper supports three loading modes:

   * `loadMode: 'always'` — the backwards-compatible default. PostHog loads immediately and c15t synchronizes measurement consent through PostHog's APIs. Use this when you intentionally want PostHog cookieless behavior after rejection.
   * `loadMode: 'after-consent'` — PostHog is not requested until measurement consent is granted. This is the recommended GDPR/EU cookie-banner default when your policy requires no PostHog network activity before consent.
   * `loadMode: 'disabled'` — returns an inert callback-only script with no PostHog network request. Use this for environment flags or temporary rollouts.

   > ℹ️ Info:
   > For a privacy-first GDPR/EU cookie-banner setup, use region: 'eu' with loadMode: 'after-consent'. This keeps PostHog Cloud in the EU region and prevents any PostHog script request until measurement consent is granted.

   The helper includes these PostHog init defaults:

   ```ts
   const initOptions = {
     api_host: 'https://eu.i.posthog.com',
     ui_host: 'https://eu.posthog.com',
     defaults: '2026-01-30',
     cookieless_mode: 'on_reject',
   };
   ```

   You can still override any of these through initOptions. Keep cookieless\_mode: 'on\_reject' when you want PostHog to use cookieless capture after a consent rejection.

2. **Enable cookieless tracking in PostHog** Enable **Cookieless server hash mode** in your PostHog project under **Project Settings** > **Web analytics** when you use `loadMode: 'always'` and want rejected-consent traffic to be recorded cookielessly. This is required by PostHog before cookieless events are accepted.

3. **Add the script helper**

   import \{ hosted } from '@c15t/react';
   import \{ type ReactNode } from 'react';
   import \{ ConsentProvider } from 'c15t/react';
   import \{ posthog } from '@c15t/scripts/posthog';

   const scripts = \[
   &#x20;posthog(\{
   &#x20;id: 'phc\_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
   &#x20;region: 'eu',
   &#x20;loadMode: 'after-consent',
   &#x20;}),
   ];

   export function PrivacyProvider(\{ children }: \{ children: ReactNode }) \{
   &#x20;return (
   &#x20;\<ConsentProvider
   &#x20;options=\{\{
   &#x20;mode: hosted(\{ url: 'https\://your-instance.c15t.dev' }),
   &#x20;scripts,
   &#x20;}}
   &#x20;\>
   &#x20;\{children}
   &#x20;\</ConsentProvider>
   &#x20;);
   }'use client';

   import \{ hosted } from '@c15t/nextjs';

   import \{ type ReactNode } from 'react';
   import \{ ConsentProvider } from 'c15t/next';
   import \{ posthog } from '@c15t/scripts/posthog';

   const scripts = \[
   &#x20;posthog(\{
   &#x20;id: 'phc\_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
   &#x20;region: 'eu',
   &#x20;loadMode: 'after-consent',
   &#x20;}),
   ];

   export function PrivacyProvider(\{ children }: \{ children: ReactNode }) \{
   &#x20;return (
   &#x20;\<ConsentProvider
   &#x20;options=\{\{
   &#x20;mode: hosted(\{ url: '/api/c15t' }),
   &#x20;scripts,
   &#x20;}}
   &#x20;\>
   &#x20;\{children}
   &#x20;\</ConsentProvider>
   &#x20;);
   }import \{ createConsentKernel, createHostedTransport } from '@c15t/core';
   import \{ createPersistence } from '@c15t/core/modules/persistence';
   import \{ createScriptLoader } from '@c15t/core/modules/script-loader';
   import \{ posthog } from '@c15t/scripts/posthog';

   const kernel = createConsentKernel(\{
   &#x20;transport: createHostedTransport(\{
   &#x20;backendURL: 'https\://consent.example.com',
   &#x20;}),
   });
   const persistence = createPersistence(\{ kernel });
   const loader = createScriptLoader(\{
   &#x20;kernel,
   &#x20;scripts: \[
   &#x20;posthog(\{
   &#x20;id: 'phc\_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
   &#x20;region: 'eu',
   &#x20;loadMode: 'after-consent',
   &#x20;}),
   &#x20;],
   });
   await kernel.commands.init();
   // On teardown: loader.dispose(); persistence.dispose(); kernel.dispose();

### No PostHog request before consent

If your policy requires PostHog to be completely absent until the user grants measurement consent, use `loadMode: 'after-consent'`:

```ts
import { posthog } from '@c15t/scripts/posthog';

const scripts = [
  posthog({
    id: 'phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    region: 'eu',
    loadMode: 'after-consent',
  }),
];
```

With this mode, c15t does not inject the PostHog script until `measurement` consent is granted. PostHog cannot record cookieless rejected-consent events because the SDK has not loaded.

For PostHog Cloud US, switch the region:

```ts
posthog({
  id: 'phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  region: 'us',
});
```

## How c15t loads it

* **Category:** `measurement` (Analytics)
* **SDK pattern:** your app loads `posthog-js`; c15t synchronizes
  measurement consent with PostHog opt-in and opt-out APIs.
* **Script helper pattern:** by default, c15t loads PostHog on page start with
  [`alwaysLoad`](/docs/frameworks/react/script-loader#always-load), then
  switches PostHog between cookie-based and cookieless capture as consent
  changes. Set `loadMode: 'after-consent'` to block the script request until
  measurement consent is granted.

## Tracking events in your app

The behavior depends on which pattern you chose:

* **SDK Implementation** — your app loaded `posthog-js` itself, so `posthog.capture(...)` is available once your SDK setup has run. c15t calls `opt_in_capturing()` / `opt_out_capturing()` for you. Pending events before c15t syncs consent may be dropped; after denial, PostHog captures cookieless events.
* **Script Implementation with `loadMode: 'always'`** — `window.posthog` is defined early. c15t calls `opt_in_capturing()` / `opt_out_capturing()` based on consent. Pending events before the PostHog bootstrap finishes may be dropped; after denial, PostHog captures cookieless events when your PostHog project supports cookieless mode.
* **Script Implementation with `loadMode: 'after-consent'`** — PostHog is unavailable until measurement consent is granted. Guard `posthog.capture(...)` calls or call them only after consent.

> ⚠️ **Warning:**
> PostHog may start a new session when a user moves between cookieless and cookie-based capture. This can split pre-consent and post-consent activity into separate sessions, which may inflate session counts or affect funnels around the consent boundary. Treat this as a PostHog analytics limitation, not a c15t consent sync issue. See the upstream PostHog session continuity issue.

```ts
posthog.capture('signup');
```

You do not need to guard these calls with `useConsentManager().has('measurement')` when cookieless measurement after rejection is acceptable. Add your own guard if denied consent should mean no PostHog event capture at all.

## Consent and privacy

PostHog's GDPR guidance recommends using PostHog Cloud EU for robust GDPR compliance, configuring consent clearly, and limiting what personal data is collected. Cookieless mode helps avoid browser persistence when measurement consent is rejected, but it does not replace your own legal basis, consent language, data minimization, IP capture settings, or right-to-be-forgotten process.

## Types

### PosthogConsentOptions

|Property|Type|Description|Default|Required|
|:--|:--|:--|:--|:--:|
|id|string|Your posthog id, begins with 'phc\_'.|-|✅ Required|
|region|PosthogRegion \|undefined|PostHog Cloud region used to derive hosts when explicit host options are not&#xA;provided.|'eu'|Optional|
|apiHost|string \|undefined|Your posthog api host.|'https\://eu.i.posthog.com'|Optional|
|uiHost|string \|undefined|Your PostHog UI host. Defaults to the UI host for the selected region or&#xA;inferred API host region.|-|Optional|
|scriptUrl|string \|undefined|The PostHog array loader URL.|-|Optional|
|loadMode|PosthogLoadMode \|undefined|How c15t should load the PostHog script.&#xA;&#xA;- \`always\`: load immediately and synchronize consent through PostHog APIs.&#xA;- \`after-consent\`: wait for measurement consent before loading PostHog.&#xA;- \`disabled\`: return an inert callback-only script with no network request.|'always'|Optional|
|initOptions|Record\<string, unknown> \|undefined|PostHog init options passed to \`posthog.init(...)\`.|-|Optional|

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
