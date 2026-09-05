---
title: Crisp
description: Load Crisp live chat with website ID, runtime, cookie, and session options.
group: integrations
icon: crisp
---
Crisp adds the Crisp live chat widget and exposes the `$crisp` queue for
chatbox actions such as opening the chat, setting user details, and resetting
sessions.

## Official Crisp documentation

* [Web Chat SDK](https://docs.crisp.chat/guides/chatbox-sdks/web-sdk/)
* [$crisp methods](https://docs.crisp.chat/guides/chatbox-sdks/web-sdk/dollar-crisp/)
* [Identity verification](https://docs.crisp.chat/guides/chatbox-sdks/web-sdk/identity-verification/)
* [Cookie policies](https://docs.crisp.chat/guides/chatbox-sdks/web-sdk/cookie-policies/)
* [Session continuity](https://docs.crisp.chat/guides/chatbox-sdks/web-sdk/session-continuity/)
* [Language customization](https://docs.crisp.chat/guides/chatbox-sdks/web-sdk/language-customization/)

## Integrate with c15t

**React**

```tsx
import { hosted } from '@c15t/react';
import { type ReactNode } from 'react';
import { ConsentProvider } from 'c15t/react';
import { crisp } from '@c15t/scripts/crisp';

const scripts = [crisp({ websiteId: 'crisp-123' })];

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
import { crisp } from '@c15t/scripts/crisp';

const scripts = [crisp({ websiteId: 'crisp-123' })];

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
import { crisp } from '@c15t/scripts/crisp';

const kernel = createConsentKernel({
  transport: createHostedTransport({
    backendURL: 'https://consent.example.com',
  }),
});
const persistence = createPersistence({ kernel });
const loader = createScriptLoader({
  kernel,
  scripts: [crisp({ websiteId: 'crisp-123' })],
});
await kernel.commands.init();
// On teardown: loader.dispose(); persistence.dispose(); kernel.dispose();
```

## How c15t loads it

* **Category:** `functionality` (Functional)
* **Loads when:** functionality consent is granted
* **Before load:** c15t seeds `window.$crisp`, `CRISP_WEBSITE_ID`, and any
  optional Crisp runtime globals
* **On revocation:** c15t follows the default script loader behavior for
  non-persistent scripts

## Configure the integration

The helper seeds Crisp's documented globals before loading
`https://client.crisp.chat/l.js`.

```ts
crisp({
  websiteId: 'crisp-123',
  locale: 'fr',
  cookieDomain: 'app.example.com',
  cookieExpiry: 3600,
  tokenId: 'secure-user-token',
  sessionMerge: true,
  safeMode: true,
});
```

`locale` and `sessionMerge` are written to `CRISP_RUNTIME_CONFIG`.
`cookieDomain` maps to `CRISP_COOKIE_DOMAIN`, `cookieExpiry` maps to
`CRISP_COOKIE_EXPIRE`, and `tokenId` maps to `CRISP_TOKEN_ID`. `safeMode`
queues `['safe', true]` on `window.$crisp` before the loader runs so Crisp
starts in safe mode.

For session continuity, generate `tokenId` on your backend with a secure random
value. Do not use emails, hashes of emails, timestamps, or incrementing IDs as
Crisp session tokens. If you verify user emails, generate the HMAC signature on
your backend and set it with Crisp's `$crisp` API after the helper loads.

## Types

### CrispOptions

|Property|Type|Description|Default|Required|
|:--|:--|:--|:--|:--:|
|websiteId|string|Your Crisp website ID.|-|✅ Required|
|locale|string \|undefined|Optional locale passed through \`window\.CRISP\_RUNTIME\_CONFIG\`.|-|Optional|
|cookieDomain|string \|undefined|Optional cookie domain override for Crisp.|-|Optional|
|cookieExpiry|number \|undefined|Optional cookie expiration in seconds.|-|Optional|
|tokenId|string \|undefined|Optional Crisp token ID for session continuity.|-|Optional|
|sessionMerge|boolean \|undefined|Whether to merge anonymous sessions into token-backed sessions.|-|Optional|
|safeMode|boolean \|undefined|Whether to enable \`$crisp\` safe mode before other queued calls.|-|Optional|
|scriptSrc|string \|undefined|Crisp loader URL.|-|Optional|

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
