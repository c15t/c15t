---
title: Google Tag Manager and Consent Mode
description: Load GTM with c15t consent signals and verify the tags inside your container.
group: integrations
---

## Register the container

```ts
import { googleTagManager } from '@c15t/scripts/google-tag-manager';

export const scripts = [googleTagManager({ id: 'GTM-XXXXXXX' })];
```

Replace the container ID and pass `scripts` to your existing provider options.
Remove the previous GTM snippet and any duplicate framework integration. The
helper sends a `consent-update` event after consent changes; `updateEventName`
customizes that event name.

## Consent Mode is not a zero-request gate

This helper sets `alwaysLoad: true`. It prepares the Google queue, sends consent
defaults and updates, and loads Google's script even before a visitor makes a
choice. That is different from preventing any request to Google until consent.
Google describes the distinction in its
[Consent Mode overview](https://developers.google.com/tag-platform/security/concepts/consent-mode).

The default mapping is:

| c15t category   | Google consent types                               |
| --------------- | -------------------------------------------------- |
| `necessary`     | `security_storage`                                 |
| `functionality` | `functionality_storage`                            |
| `measurement`   | `analytics_storage`                                |
| `marketing`     | `ad_storage`, `ad_user_data`, `ad_personalization` |
| `experience`    | `personalization_storage`                          |

`consentMapping` replaces the mapping when supplied. Keep the full set of
signals your integration needs. Test both default and update commands and the
actual tag behavior. Do not infer a saved grant from an allowed default under an
opt-out policy.

## Configure the container too

Loading GTM with consent signals does not make every custom tag consent-aware.
Configure the appropriate consent checks and triggers for tags inside the
container. Inspect their requests after rejection and revocation, including
non-Google tags. Use Google Tag Assistant alongside the browser Network panel.

If the requirement is no Google request before permission, do not deploy this
always-loaded helper unchanged. Choose and verify an explicitly gated setup.
