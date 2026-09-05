---
title: Script Loader
description: Gate third-party scripts behind consent in Next.js — load Google
  Analytics, Meta Pixel, and other tracking scripts only when users grant
  permission.
group: frameworks
---
The script loader manages third-party JavaScript based on consent state. You declare scripts in your provider's `scripts` option, and c15t decides when each script should load, stay loaded, unload, or receive a consent update.

Use it for analytics, pixels, tag managers, product analytics, and other vendor snippets that should not run until the right consent condition is satisfied. Prebuilt helpers live in [`@c15t/scripts`](/docs/integrations/overview); custom scripts can be declared directly when the vendor is specific to your app.

<PackageCommandTabs mode="install" command="@c15t/scripts" />

> ℹ️ **Info:**
> Start with the integrations overview before writing your own script. Built-in helpers encode vendor boot order, consent updates, and common defaults so you do not have to.
>
> 📝 **Note:**
> If you need a vendor c15t does not ship yet, see the custom integration guide. It explains when a one-off Script is enough and when to build a reusable manifest-backed helper.
>
> ℹ️ **Info:**
> The script loader handles JavaScript tags and callback lifecycles. For iframe-only embeds, use the iframe blocking pattern. For UI components such as maps or video players, combine consent state with a component-level placeholder or a dedicated renderable integration.

## Basic Usage

Pass an array of scripts to `ConsentProvider`. Built-in helpers from `@c15t/scripts` return plain `Script` objects, so they sit beside app-specific scripts:

```tsx
import { hosted } from '@c15t/nextjs';
import { type ReactNode } from 'react';
import { ConsentProvider } from 'c15t/next';
import { metaPixel } from '@c15t/scripts/meta-pixel';

export function ConsentManager({ children }: { children: ReactNode }) {
  return (
    <ConsentProvider
      options={{
        mode: hosted({ url: '/api/c15t' }),
        scripts: [
          metaPixel({ pixelId: '123456' }),
          {
            id: 'custom-analytics',
            src: 'https://cdn.example.com/analytics.js',
            category: 'measurement',
          },
        ],
      }}
    >
      {children}
    </ConsentProvider>
  );
}
```

The script loader runs in the browser, so place the provider in the client boundary that owns your consent UI and pass scripts through the provider options instead of injecting them in Server Components.

## Recommended Structure

Define your script list once and keep it next to the consent provider:

```tsx
'use client';

import { hosted } from '@c15t/nextjs';

import { type ReactNode } from 'react';
import { ConsentProvider } from 'c15t/next';
import { gtag } from '@c15t/scripts/google-tag';
import { metaPixel } from '@c15t/scripts/meta-pixel';

const scripts = [gtag({ id: 'G-XXXXXXX' }), metaPixel({ pixelId: '123456' })];

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

Use environment variables or server-rendered configuration to choose ids per environment, but avoid rendering vendor scripts with `next/script` separately — that bypasses c15t's lifecycle for that vendor.

## Mental Model

Every script you register has the same lifecycle. c15t evaluates each script against the current consent state, then drives it through a small number of states:

1. **Pending** — registered but waiting for consent. Nothing is in the DOM yet.
2. **Loaded** — consent matched, c15t injected the script (or ran callbacks for callback-only scripts).
3. **Updated** — already loaded, consent state changed, `onConsentChange` ran so the SDK can react.
4. **Unloaded** — consent was revoked. c15t removed the script element unless you opted into persistence.

Four lifecycle callbacks let you hook into transitions: `onBeforeLoad`, `onLoad`, `onConsentChange`, and `onError`. Two flags — [`alwaysLoad`](#always-load) and [`persistAfterConsentRevoked`](#persist-after-revocation) — change how c15t treats consent boundaries. Everything else (DOM placement, ad-block evasion, dynamic management) is a refinement on top of this core model.

## Choose the Right Approach

Most projects mix more than one style. Pick the smallest one that keeps consent behavior obvious:

|Style|Use when|
|--|--|
|**Built-in helper** from `@c15t/scripts`|c15t already ships the vendor. See the [integrations overview](/docs/integrations/overview).|
|**Plain `Script`**|One-off app code with simple load and callback behavior.|
|**Callback-only `Script`**|Another package already loaded the SDK; c15t only synchronizes consent.|
|**Manifest-backed helper**|Reusable vendor integration with structured setup phases, queues, stubs, or a vendor consent API.|
|**Iframe / renderable integration**|Vendor exposes an iframe or React component, not just a `<script>` tag.|

## Script Types

### Standard Scripts

Standard scripts load an external JavaScript file via a `<script>` tag. This is the default for most analytics and pixel SDKs:

```tsx
{
  id: 'analytics',
  src: 'https://cdn.example.com/analytics.js',
  category: 'measurement',
}
```

### Inline Scripts

Inline scripts execute JavaScript from `textContent` instead of loading a URL. Use these sparingly; a manifest-backed helper is usually better for reusable vendor code.

```tsx
{
  id: 'gtag-config',
  textContent: `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-XXXXXX');
  `,
  category: 'measurement',
}
```

### Callback-Only Scripts

Callback-only scripts do not inject a script tag. They run lifecycle callbacks when consent allows them to. Use this when another package has already loaded the SDK and c15t only needs to drive consent:

```tsx
{
  id: 'posthog-consent',
  callbackOnly: true,
  category: 'measurement',
  onLoad: ({ hasConsent }) => {
    if (hasConsent) {
      posthog.opt_in_capturing();
    }
  },
  onConsentChange: ({ hasConsent }) => {
    if (hasConsent) {
      posthog.opt_in_capturing();
    } else {
      posthog.opt_out_capturing();
    }
  },
}
```

### Manifest-Backed Helpers

Built-in integrations in `@c15t/scripts` are manifest-backed. A manifest describes vendor setup as structured phases, then c15t compiles it into a `Script`. Manifests keep queue stubs, script URLs, consent signaling, and post-load work consistent across apps and they are safe to ship from a server.

Use a manifest-backed helper when:

* the integration should be reused across projects,
* the vendor snippet has ordered setup steps,
* the vendor exposes a consent API,
* or you plan to contribute the integration back to c15t.

Read the [custom integration guide](/docs/integrations/building-integrations) for the manifest contract, phases, and testing checklist.

### Iframe And Renderable Integrations

Some vendors are not just script tags. YouTube embeds, maps, calendars, and checkout widgets often need a visible component, a placeholder, or an iframe.

* For iframe-only embeds, gate the iframe `src` with the [iframe blocking](/docs/frameworks/react/iframe-blocking) pattern instead of loading a script just to hide an iframe.
* For SDK-backed UI, use the script loader for the shared SDK and render the component only when consent and SDK readiness agree.
* Use `Frame` for an iframe embed and a configured Script for an SDK integration.
* Use `useConsentScript()` when building custom wrappers. It registers scripts through the consent store, follows `loadedScripts`, and returns a promise-shaped readiness contract for callback-based SDKs.

## Lifecycle Callbacks

Every script supports four callbacks. Each receives a `ScriptCallbackInfo` payload (id, element, hasConsent, consents):

* `onBeforeLoad` — runs before the script tag is injected. Create globals, queues, or vendor stubs here.
* `onLoad` — runs after the browser loads the script. Call vendor `init()` APIs here.
* `onConsentChange` — runs for loaded scripts when consent changes. Forward the new consent state to the vendor SDK.
* `onError` — runs when the script fails to load. Record diagnostics or render a fallback.

```tsx
{
  id: 'analytics',
  src: 'https://analytics.example.com/v2.js',
  category: 'measurement',
  onBeforeLoad: ({ id }) => {
    window.analyticsQueue = window.analyticsQueue || [];
  },
  onLoad: () => {
    window.analytics.init('my-key');
  },
  onError: ({ error }) => {
    console.error('Failed to load analytics:', error);
  },
  onConsentChange: ({ hasConsent }) => {
    window.analytics.setConsent(hasConsent);
  },
}
```

## Consent Conditions

The `category` field accepts a `HasCondition`. It can be a single consent category or a logical expression:

```tsx
// Simple: requires measurement consent
{
  category: 'measurement';
}

// AND: requires both measurement and marketing
{
  category: {
    and: ['measurement', 'marketing'];
  }
}

// OR: requires either measurement or marketing
{
  category: {
    or: ['measurement', 'marketing'];
  }
}
```

Consent categories use the same names as the rest of c15t (`necessary`, `functionality`, `experience`, `measurement`, `marketing`).

## Persistence Options

### Always Load

`alwaysLoad` loads the script regardless of whether its category is currently granted. Use it only when the vendor must be present early **and** has a reliable consent API of its own — Google Tag Manager with Consent Mode is the canonical example.

```tsx
{
  id: 'google-tag-manager',
  src: 'https://www.googletagmanager.com/gtm.js?id=GTM-XXXX',
  category: 'measurement',
  alwaysLoad: true,
}
```

When `alwaysLoad` is on, `onConsentChange` becomes mandatory: it is how the loaded SDK learns about every transition.

> ⚠️ **Warning:**
> alwaysLoad shifts compliance responsibility to the vendor integration. Make sure the script receives denied-by-default consent signals before it can track.

### Persist After Revocation

`persistAfterConsentRevoked` keeps a script in the page after consent is revoked instead of unloading it. Use it only when the vendor exposes a runtime consent toggle — otherwise unloading is safer because removing the element guarantees the SDK stops.

```tsx
{
  id: 'error-tracking',
  src: 'https://errors.example.com/track.js',
  category: 'measurement',
  persistAfterConsentRevoked: true,
  onConsentChange: ({ hasConsent }) => {
    window.ErrorTracker.setConsent(hasConsent);
  },
}
```

As with `alwaysLoad`, `onConsentChange` is how the persisted SDK learns about consent updates.

### `alwaysLoad` vs `persistAfterConsentRevoked`

These two flags answer different questions. Use this table to keep them straight:

|Question|`alwaysLoad`|`persistAfterConsentRevoked`|
|--|--|--|
|Loads before consent is granted?|Yes|No (waits for consent like a normal script)|
|Stays loaded after consent is revoked?|Yes|Yes|
|Requires a vendor consent API?|Yes|Yes|

## DOM Placement

Control where the script is injected and whether the element id is anonymized:

```tsx
{
  id: 'widget',
  src: 'https://widget.example.com/embed.js',
  category: 'experience',
  target: 'body',     // 'head' (default) or 'body'
  anonymizeId: true,  // default: true, hides the c15t script id from ad blockers
  nonce: 'abc123',    // optional CSP nonce
}
```

Set `anonymizeId: false` only when another script or test needs a stable DOM id. Pass `nonce` when your CSP requires it; c15t applies it directly to the generated `<script>` element.

You usually do not need a per-script `nonce`. Setting `nonce` once on the provider covers every injected script (and the theme stylesheet); a per-script value overrides it for that script alone.

## Dynamic Management

Framework packages expose script-manager methods so integrations can be added, removed, or inspected at runtime. Use this for tenant-specific tools, feature-flagged scripts, or vendors that are configured after sign-in:

* `setScripts(scripts)` — registers script definitions and immediately evaluates them against consent.
* `removeScript(id)` — removes a definition and unloads its element if needed.
* `isScriptLoaded(id)` — returns whether c15t has loaded a script.
* `getLoadedScriptIds()` — returns every currently loaded script id.

Dynamic scripts should still use stable ids. If the same vendor is added repeatedly with different ids, c15t treats each call as a new script.

## Calling Vendor APIs From Your App

The script loader controls **when the vendor SDK loads**. It does not intercept calls your application code makes to that SDK afterwards. Whether your event calls are safe before consent is granted depends on the script's persistence flags:

|Vendor pattern|What c15t does|What your app code must do|
|--|--|--|
|Consent-gated load, unloaded on revoke (e.g. cookieless analytics)|Script not in DOM until consent granted; removed on revoke. Global is `undefined` outside that window.|**Guard every call.** Unguarded `window.vendor.track(...)` throws when the global is absent.|
|Consent-gated load with `persistAfterConsentRevoked` (e.g. Meta Pixel)|Script not in DOM until consent granted; stays after revoke. c15t calls vendor's consent-revoke API on revocation.|Guard calls only for the pre-initial-consent window. Once loaded, the SDK handles its own suppression.|
|`alwaysLoad: true` with a vendor consent API (e.g. GTM, gtag, Databuddy, PostHog)|Script in DOM on page start; c15t signals consent state through the vendor's API.|Calls are safe — the vendor SDK suppresses transmission when consent is denied.|
|No app-facing API (e.g. Cloudflare Web Analytics)|Script in/out of DOM based on consent. Tracking is fully automatic.|Nothing to guard.|

The safe pattern in React is to read consent state through `useConsentManager().has(category)` before calling the SDK:

```tsx
import { useCallback } from 'react';
import { useConsentManager } from 'c15t/react';

function useTrackSignup() {
  const { has } = useConsentManager();

  return useCallback(() => {
    if (has('measurement')) {
      window.fathom?.trackEvent('signup');
    }
  }, [has]);
}

function SignupButton() {
  const trackSignup = useTrackSignup();

  return <button onClick={trackSignup}>Sign up</button>;
}
```

From non-React code, evaluate the current kernel snapshot:

```ts
import { evaluateConsent } from '@c15t/core';

// Reuse the kernel created during initialization.

if (evaluateConsent({ category: 'measurement' }, kernel.getSnapshot())) {
  window.fathom?.trackEvent('signup');
}
```

Each [integration page](/docs/integrations/overview) includes a vendor-specific **Tracking events in your app** block that names which pattern applies.

## Debugging Checklist

When a script does not behave as expected:

1. Confirm the script's `category` matches the consent that has been granted.
2. Check whether the script is `alwaysLoad` or consent-gated.
3. Confirm `onBeforeLoad` creates any globals before the vendor code reads them.
4. Confirm `onConsentChange` updates persisted or always-loaded scripts when consent changes.
5. Check whether the browser or an ad blocker blocked the request.
6. Use c15t devtools to inspect script lifecycle events when available.

## Dynamic scripts

Keep the provider scripts configuration stable. For an independently mounted
integration, use the exported `useScriptLoader` module hook inside the provider
and dispose its owner on unmount. The core loader handle supports
`updateScripts(nextScripts)` and `getLoadedScriptIds()`.

## Maps and media

Use `Frame` with a service-provided iframe URL for Maps and YouTube embeds.
The specialized v2 components are removed. See [Google Maps](/docs/integrations/google-maps)
and [YouTube](/docs/integrations/youtube) for working examples. For an SDK widget,
register the SDK as a Script and manage each widget instance separately.

## API Reference

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
