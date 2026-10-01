---
packages:
  '@c15t/astro': minor
  '@c15t/browser': minor
---

### Granular vendor consent in Astro and the script tag

Astro and `@c15t/browser` now support per-vendor consent like the other adapters. A visitor can allow a category and still turn one vendor off.

In Astro, pass `vendors` to `c15t()`. Vendors from the backend manifest are merged in. The preference dialog lists each category's vendors with a switch per vendor for the React, Vue and Svelte islands. The switches edit the draft and are saved with Save. They are disabled while the category is off and cleared by Accept all and Reject all. `getConsentClient()` gains `getDeclaredVendors()`, `getVendorChoice()` and `isVendorAllowed(vendorId)`, and `save()` accepts a `vendors` map. The server now asks about the categories that code-declared vendors sit in, so its banner decision matches the browser's.

In `@c15t/browser`, declare vendors with the `vendors` option or `c15t.push(['config', { vendors }])`. The stock preference centre lists vendor switches with the same behaviour and the `@c15t/ui` vendor list styles and translations. The client and `window.c15t` gain `getDeclaredVendors()`, `getVendorChoice()` and `isVendorAllowed(vendorId)`. `save()` now forwards a `vendors` map instead of dropping it, so `c15t.push(['save', { measurement: true, vendors: { posthog: false } }])` works. A change to vendors alone now emits `consent` and runs gated tags that were waiting.

Both adapters gate inert `<script type="text/plain" data-c15t-category="…">` tags by vendor when the tag also carries `data-c15t-vendor="…"`, and gate iframes that carry `data-vendor`. The nonce rule for gated tags is unchanged.
