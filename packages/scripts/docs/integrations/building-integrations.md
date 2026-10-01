---
title: Custom integrations
description: Gate a vendor that has no @c15t/integrations helper, or sync
  consent with an SDK your app already loads, using a c15t script configuration.
group: integrations
---

## Define a script

Check the [integration list](./overview.md) first. For a vendor
without a helper, write a script configuration with a stable `id`, a category
and the source URL, then register it like any helper:

```ts title="src/consent-scripts.ts"
import type { Script } from 'c15t';

const exampleAnalytics: Script = {
  id: 'example-analytics',
  category: 'measurement',
  src: 'https://analytics.example.com/sdk.js',
  onLoad() {
    // Initialize the vendor here with its documented API.
  },
  onError({ error }) {
    console.error('Analytics SDK failed to load', error);
  },
};

export const scripts = [exampleAnalytics];
```

Replace the URL and the `onLoad` body with the vendor's own setup. c15t adds the
`<script>` element only while measurement is allowed. To register `scripts`
with your framework, follow any vendor guide, for example
[Ahrefs Analytics](./ahrefs-analytics.md).

## Script fields

| Field                                           | Default                | Behavior                                                                                                              |
| ----------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `id`                                            | Required               | Stable identifier. c15t tracks the script by it across renders.                                                       |
| `category`                                      | Required               | A category name, or a condition such as `{ or: ['measurement', 'marketing'] }`, `{ and: [...] }` or `{ not: '...' }`. |
| `src` / `textContent`                           | None                   | Set exactly one, unless `callbackOnly` is `true`.                                                                     |
| `vendor`                                        | None                   | Vendor slug, so a visitor can turn this vendor off inside an allowed category.                                        |
| `callbackOnly`                                  | `false`                | Run callbacks without adding a script element.                                                                        |
| `alwaysLoad`                                    | `false`                | Load regardless of permission.                                                                                        |
| `persistAfterConsentRevoked`                    | `false`                | Keep the script element when permission is revoked.                                                                   |
| `onBeforeLoad`, `onLoad`, `onError`             | None                   | Run before the element is added, after it loads, and if it fails.                                                     |
| `onConsentChange`                               | None                   | Runs when permissions change after the script has loaded, and when it is removed.                                     |
| `onDispose`                                     | None                   | Runs when this configuration is removed or its loader is disposed. Revocation alone does not call it.                 |
| `target`                                        | `'head'`               | `'head'` or `'body'`.                                                                                                 |
| `async`, `defer`, `attributes`, `fetchPriority` | None                   | Copied to the script element.                                                                                         |
| `nonce`                                         | The provider's `nonce` | Content Security Policy nonce for this element.                                                                       |
| `anonymizeId`                                   | `true`                 | Use a random element ID. Set `false` for `c15t-script-<id>`.                                                          |

Every callback receives `{ id, elementId, hasConsent, consents }`, plus
`vendor` when the script declares one, and `element` for scripts with an
element.

## Load before consent and signal the vendor

Use `alwaysLoad` only for an SDK that has its own consent API, such as a
Consent Mode tag. The script loads on every page and c15t never removes it on
a permission change. `hasConsent` in each callback still reports the real
permission, so pass it to the SDK:

```ts
const consentModeTag = {
  id: 'example-consent-mode',
  category: 'marketing',
  src: 'https://tags.example.com/tag.js',
  alwaysLoad: true,
  onBeforeLoad({ hasConsent }) {
    window.exampleTag = window.exampleTag ?? [];
    window.exampleTag.push(['consent', hasConsent ? 'grant' : 'deny']);
  },
  onConsentChange({ hasConsent }) {
    window.exampleTag?.push(['consent', hasConsent ? 'grant' : 'deny']);
  },
};
```

`window.exampleTag` stands for the vendor's own queue. An `alwaysLoad` script
makes requests before any choice, so it does not meet a requirement of no
vendor request before consent.

## Keep a loaded SDK and switch it off

`persistAfterConsentRevoked: true` keeps the script element when permission is
revoked. c15t then calls `onConsentChange` with `hasConsent: false`, which is
where you call the vendor's opt-out API. If permission comes back on the same
page, c15t reuses the element and calls `onConsentChange` again with
`hasConsent: true`; `onLoad` does not run twice.

```ts
const examplePixel = {
  id: 'example-pixel',
  category: 'marketing',
  src: 'https://pixel.example.com/pixel.js',
  persistAfterConsentRevoked: true,
  onConsentChange({ hasConsent }) {
    window.examplePixel?.(hasConsent ? 'optIn' : 'optOut');
  },
};
```

Nothing persists across a reload. After c15t's revocation reload, or any later
page load, the script loads again only when permission allows it. Without
`persistAfterConsentRevoked`, c15t removes the element on revocation, then
calls `onConsentChange`.

## Sync an SDK your app already loads

`callbackOnly: true` adds no script element. Use it when your app imports and
initializes the SDK itself and c15t only has to tell it the permission. Pair
it with `alwaysLoad` so the callbacks run on the first page load even while
permission is denied:

```ts
const existingSdkConsent = {
  id: 'existing-sdk-consent',
  category: 'measurement',
  callbackOnly: true,
  alwaysLoad: true,
  onBeforeLoad({ hasConsent }) {
    existingSdk.setTracking(hasConsent);
  },
  onConsentChange({ hasConsent }) {
    existingSdk.setTracking(hasConsent);
  },
};
```

`existingSdk` stands for your initialized SDK. c15t does not delay its import
or its first request, so initialize it with tracking off. Without `alwaysLoad`,
a callback-only script runs `onBeforeLoad` and `onLoad` only once permission is
allowed. [PostHog](./posthog.md#use-an-existing-posthog-sdk) shows
this pattern with a real SDK.

## Revocation and verification

By default c15t reloads the page when a visitor turns off a category or vendor
they had allowed, because removing a script element does not stop code that
already ran. Set `reloadOnConsentRevoked: false` only if every script stops
itself in `onConsentChange`.

For a nonce-based Content Security Policy, set the provider's `nonce` option or
a per-script `nonce`. Then test the script the way the vendor guides do. Check
for no request before a choice or after rejection, a load after allowing, and
no request after revocation and reload. See
[consent verification](../guides/verify-consent.md).
