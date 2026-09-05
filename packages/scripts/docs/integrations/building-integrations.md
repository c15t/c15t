---
title: Build a Custom Script Integration
description: Learn when to use a raw Script, when to build a reusable
  manifest-backed integration, and how to debug and test custom consent-aware
  scripts in c15t.
group: integrations
---
If you cannot find a prebuilt integration in [`@c15t/scripts`](/docs/integrations/overview), you have two good options:

1. Build a one-off `Script` object directly in your app.
2. Build a reusable manifest-backed integration helper.

Use the first option for app-specific scripts. Use the second option when you want something reusable, testable, and aligned with c15t's manifest system.

## Choose the Right Level

### One-off app script

Use a raw `Script` when:

* the integration is only used in one app
* the vendor setup is small
* you do not need to publish or share the helper

```ts
import type { Script } from 'c15t';

export function acmeAnalytics(siteId: string): Script {
  return {
    id: 'acme-analytics',
    src: `https://cdn.acme.com/analytics.js?site=${siteId}`,
    category: 'measurement',
    onBeforeLoad: () => {
      window.acmeQueue = window.acmeQueue || [];
    },
    onConsentChange: ({ hasConsent }) => {
      window.acme?.setConsent(hasConsent);
    },
  };
}
```

### Reusable manifest-backed integration

Use a manifest-backed helper when:

* you want to contribute to `@c15t/scripts`
* you want the integration to be reusable across apps
* you need structured startup/setup phases
* you want compatibility with c15t's server-side support for script loading

Manifest integrations should be declarative, serializable, and built from structured steps rather than raw inline JavaScript strings.

## Manifest Contract

Every reusable manifest carries two contract fields:

* `kind`: identifies the payload as a c15t vendor manifest
* `schemaVersion`: identifies which manifest schema the runtime should compile

Use `vendorManifestContract` so helpers stay aligned with the runtime's current contract:

```ts
const acmeManifest = {
  ...vendorManifestContract,
  vendor: 'acme-analytics',
  // ...
} as const satisfies VendorManifest;
```

If manifests are sent from a server later, these fields are how the client can validate that it knows how to interpret the payload before executing anything.

## Manifest Mental Model

The manifest runtime executes a script in ordered phases:

* `bootstrap`: globals or stubs that must exist before anything else
* `install`: startup steps plus a single `loadScript`
* `afterLoad`: work that should run after the external script loads
* `onBeforeLoadGranted` / `onBeforeLoadDenied`: initial consent-specific setup
* `onLoadGranted` / `onLoadDenied`: post-load consent-specific setup
* `onConsentChange`: runs on every consent update
* `onConsentGranted` / `onConsentDenied`: branch-specific consent updates

For vendors with explicit consent APIs, you can also use:

* `consentMapping`
* `consentSignal`
* `consentSignalTarget`

That is how the Google integrations map c15t consent categories to Consent Mode v2 and inject `default` and `update` signals in the correct phase order.

`category` supports the same consent condition model as a plain `Script`, so manifests can represent simple or nested rules such as:

```ts
category: { and: ['measurement', { not: 'marketing' }] }
```

## Structured Steps

Prefer structured steps over raw script text. The current manifest DSL supports patterns like:

* `setGlobal`
* `setGlobalPath`
* `defineQueueFunction`
* `defineStubFunction`
* `pushToQueue`
* `callGlobal`
* `defineQueueMethods`
* `defineGlobalMethods`
* `constructGlobal`
* `loadScript`

These steps are easier to validate, test, debug, and eventually transport from the server.

## Example Manifest Integration

If you are building a reusable helper, the pattern looks like this:

```ts
import type { Script } from 'c15t';
import { resolveManifest } from '@c15t/scripts/resolve';
import {
  vendorManifestContract,
  type VendorManifest,
} from '@c15t/scripts/types';

const acmeManifest = {
  ...vendorManifestContract,
  vendor: 'acme-analytics',
  category: 'measurement',
  bootstrap: [
    {
      type: 'setGlobal',
      name: 'acmeQueue',
      value: [],
      ifUndefined: true,
    },
    {
      type: 'defineQueueFunction',
      name: 'acme',
      queue: 'acmeQueue',
      ifUndefined: true,
    },
  ],
  install: [
    {
      type: 'callGlobal',
      global: 'acme',
      args: ['init', '{{siteId}}'],
    },
    {
      type: 'loadScript',
      src: 'https://cdn.acme.com/analytics.js?site={{siteId}}',
      async: true,
    },
  ],
  onConsentGranted: [
    {
      type: 'callGlobal',
      global: 'acme',
      args: ['consent', true],
    },
  ],
  onConsentDenied: [
    {
      type: 'callGlobal',
      global: 'acme',
      args: ['consent', false],
    },
  ],
} as const satisfies VendorManifest;

export function acmeAnalytics(siteId: string): Script {
  return resolveManifest(acmeManifest, { siteId });
}
```

## Design Guidelines

When building an integration, prefer these rules:

* Keep helper logic thin. Put behavior in the manifest, not in post-resolution callback mutation.
* Keep manifests serializable. Avoid helper-only runtime branches where possible.
* Use explicit config inputs. Avoid generic override bags when a named option is clearer.
* Use `alwaysLoad` only when the vendor truly manages its own consent correctly.
* Use `persistAfterConsentRevoked` only when the vendor exposes a real consent toggle and does not need a full reload.
* Keep vendor-specific naming out of the core DSL when a generic step can express it.

## Testing Checklist

At minimum, test these flows:

1. Initial page load with consent denied.
2. Initial page load with consent granted.
3. Consent granted after the script was previously denied.
4. Consent revoked after the script was previously active.
5. Existing script element reuse if the script persists after revocation.
6. Error handling if the vendor global or loader is missing.

If you are contributing to `@c15t/scripts`, add focused engine/helper tests similar to the existing tests in `packages/scripts/src/engine.test.ts` and `packages/scripts/src/helpers.test.ts`.

## Debugging

Use `@c15t/dev-tools` while implementing and testing integrations.

The scripts panel now shows:

* whether a script is loaded, pending, or blocked
* grouped activity for `onBeforeLoad`, `onLoad`, and `onConsentChange`
* manifest phase activity such as `bootstrap`, `consent-default`, `setup`, and `afterLoad`

The events panel also records script lifecycle and manifest step events, which is useful when a vendor reads consent too early or a startup step runs in the wrong order.

## When to Stop and Use a Plain Script

Not every integration needs a reusable manifest helper.

If the vendor snippet is tiny, unique to one app, or mostly static, a plain `Script` object in your runtime options is usually the simpler choice. Reach for the manifest system when you need reuse, consistency, structured startup behavior, or a path to server-driven manifests.

## Reference Types

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

### VendorManifest

|Property|Type|Description|Default|Required|
|:--|:--|:--|:--|:--:|
|kind|"c15t.vendor-manifest"|Manifest contract identifier.|-|✅ Required|
|schemaVersion|1|Manifest schema version.|-|✅ Required|
|vendor|string|Unique vendor identifier (used as Script.id)|-|✅ Required|
|category|ManifestCategoryCondition|Consent category or condition required to load this vendor|-|✅ Required|
|alwaysLoad|string \|boolean \|undefined|Load regardless of consent state (vendor manages its own consent internally)|-|Optional|
|persistAfterConsentRevoked|string \|boolean \|undefined|Keep script in DOM after consent revocation (vendor has a consent API)|-|Optional|
|bootstrap|ManifestStep\[] \|undefined|Steps that must execute before default consent signaling.&#xA;&#xA;This is primarily used for integrations such as Google tags where a stub&#xA;global must exist before calling the vendor's consent API.|-|Optional|
|install|ManifestStep\[]|Steps to execute when installing the vendor.&#xA;&#xA;The resolver extracts the script source from these steps:&#xA;- If a \`loadScript\` step exists, its \`src\` becomes \`Script.src\`&#xA;- All non-\`loadScript\` steps run as part of \`onBeforeLoad\`|-|✅ Required|
|afterLoad|ManifestStep\[] \|undefined|Steps to execute after the main script loads|-|Optional|
|onBeforeLoadGranted|ManifestStep\[] \|undefined|Steps to execute before load when the vendor has consent|-|Optional|
|onBeforeLoadDenied|ManifestStep\[] \|undefined|Steps to execute before load when the vendor does not have consent|-|Optional|
|onLoadGranted|ManifestStep\[] \|undefined|Steps to execute after load when the vendor has consent|-|Optional|
|onLoadDenied|ManifestStep\[] \|undefined|Steps to execute after load when the vendor does not have consent|-|Optional|
|onConsentChange|ManifestStep\[] \|undefined|Steps to run on any consent state change|-|Optional|
|onConsentGranted|ManifestStep\[] \|undefined|Steps to run when this vendor's category consent is granted|-|Optional|
|onConsentDenied|ManifestStep\[] \|undefined|Steps to run when this vendor's category consent is denied|-|Optional|
|consentMapping|Record\<string, string\[]> \|undefined|Maps c15t consent categories to vendor-specific consent type names.&#xA;&#xA;Used with \`consentSignal\` to translate c15t consent state into&#xA;the vendor's consent API format.|-|Optional|
|consentSignal|ConsentSignalType \|undefined|How to signal consent state to the vendor|-|Optional|
|consentSignalTarget|string \|undefined|Target global for consent signaling (defaults based on signal type)|-|Optional|
