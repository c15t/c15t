---
title: LogRocket
description: Session replay and monitoring loaded after measurement consent with
  LogRocket's browser SDK.
group: integrations
icon: logrocket
---
[LogRocket](https://logrocket.com) records session replay, frontend errors, network activity, console logs, and user behavior so product and engineering teams can debug production sessions. c15t loads `LogRocket.min.js` with `crossorigin="anonymous"` and then calls `window.LogRocket.init('org-slug/app-slug')`.

## Integrate with c15t

**React**

```tsx
import { hosted } from '@c15t/react';
import { type ReactNode } from 'react';
import { ConsentProvider } from 'c15t/react';
import { logRocket } from '@c15t/scripts/logrocket';

const scripts = [
  logRocket({
    appId: 'YOUR_ORG_SLUG/YOUR_APP_SLUG',
    initOptions: {
      dom: {
        inputSanitizer: true,
      },
    },
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
import { logRocket } from '@c15t/scripts/logrocket';

const scripts = [
  logRocket({
    appId: 'YOUR_ORG_SLUG/YOUR_APP_SLUG',
    initOptions: {
      dom: {
        inputSanitizer: true,
      },
    },
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
import { logRocket } from '@c15t/scripts/logrocket';

const kernel = createConsentKernel({
  transport: createHostedTransport({
    backendURL: 'https://consent.example.com',
  }),
});
const persistence = createPersistence({ kernel });
const loader = createScriptLoader({
  kernel,
  scripts: [
    logRocket({
      appId: 'YOUR_ORG_SLUG/YOUR_APP_SLUG',
      initOptions: {
        dom: {
          inputSanitizer: true,
        },
      },
    }),
  ],
});
await kernel.commands.init();
// On teardown: loader.dispose(); persistence.dispose(); kernel.dispose();
```

## How c15t loads it

* **Category:** `measurement` (Analytics)
* **Loads when:** measurement consent is granted
* **On revocation:** unloaded - c15t removes the script element from the DOM. LogRocket does not document a web SDK consent opt-out or stop-recording API equivalent to Clarity or Mixpanel consent methods, and removing the loader does not stop an already-initialized recorder in the current page view. Revocation fully takes effect on the next page load.

The helper maps the script-tag snippet into the manifest engine:

```ts
logRocket({
  appId: 'YOUR_ORG_SLUG/YOUR_APP_SLUG',
});
```

It loads `https://cdn.logrocket.io/LogRocket.min.js` with `crossorigin="anonymous"` and calls:

```ts
window.LogRocket?.init('YOUR_ORG_SLUG/YOUR_APP_SLUG', initOptions);
```

after the script load event. `appId` is required and must be in `org/app` format.

## Privacy and sanitization

LogRocket captures user behavior for replay, so configure sanitization before deploying it. LogRocket documents DOM redaction with `data-private`, automatic text/input/image sanitization, and network request/response sanitizers. Password fields are never recorded, but other sensitive inputs, DOM nodes, network payloads, Redux state, and Redux actions should be explicitly excluded.

Pass JSON-serializable LogRocket init options as `initOptions`:

```ts
logRocket({
  appId: 'YOUR_ORG_SLUG/YOUR_APP_SLUG',
  initOptions: {
    dom: {
      inputSanitizer: true,
      textSanitizer: true,
      imageSanitizer: true,
      privateClassNameBlocklist: ['private-profile'],
      privateAttributeBlocklist: ['data-hide-from-replay'],
    },
  },
});
```

Only pass values that can safely cross the manifest boundary. Avoid functions, class instances, prototypes, `Map`, `Set`, or other non-JSON types unless you are constructing a manual `Script` outside the manifest helper. LogRocket also supports function-based network sanitizers; use a manual `Script` if you need those callbacks.

To proxy or self-host the loader, pass a custom URL. LogRocket's proxy setup also chain-loads a logger bundle, so set `asyncScriptUrl` as well — otherwise the async bundle is still fetched from LogRocket's CDN:

```ts
logRocket({
  appId: 'YOUR_ORG_SLUG/YOUR_APP_SLUG',
  scriptUrl: 'https://analytics.example.com/LogRocket.min.js',
  asyncScriptUrl: 'https://analytics.example.com/logger.min.js',
});
```

## Types

### LogRocketOptions

|Property|Type|Description|Default|Required|
|:--|:--|:--|:--|:--:|
|appId|string|Your LogRocket app ID in \`org-slug/app-slug\` format.|-|✅ Required|
|initOptions|Record\<string, unknown> \|undefined|LogRocket init options passed as the second \`LogRocket.init()\` argument.&#xA;&#xA;The manifest engine serializes this object as a template variable, so use&#xA;JSON-serializable values only (no functions, class instances, prototypes,&#xA;\`Map\`, \`Set\`, or other non-JSON types).|-|Optional|
|scriptUrl|string \|undefined|Custom LogRocket loader URL.|'https\://cdn.logrocket.io/LogRocket.min.js'|Optional|
|asyncScriptUrl|string \|undefined|Proxied URL for LogRocket's asynchronously loaded logger bundle.&#xA;&#xA;LogRocket's proxy setup requires \`window.\_lrAsyncScript\` in addition to&#xA;the main \`scriptUrl\`, because the SDK chain-loads its logger bundle from&#xA;this location. Only needed when proxying traffic through your own&#xA;domain.|-|Optional|

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
