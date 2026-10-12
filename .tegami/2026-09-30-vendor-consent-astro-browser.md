---
packages:
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
---

### Granular vendor consent in Astro and the script tag

Astro and `@c15t/browser` support per-vendor consent, so a visitor can allow a
category and still turn one vendor off. The preference dialogs list a switch
per vendor.

In Astro, pass `vendors` to `c15t()`. Vendors from the backend manifest are
merged in. `getConsentClient()` gains `getDeclaredVendors()`,
`getVendorChoice()` and `isVendorAllowed(vendorId)`, and `save()` accepts a
`vendors` map.

In `@c15t/browser`, declare vendors with the `vendors` option or
`c15t.push(['config', { vendors }])`. The client and `window.c15t` gain the
same three methods, and `save()` forwards a `vendors` map instead of dropping
it.

Both adapters gate `<script type="text/plain" data-c15t-category="…">` tags
that also carry `data-c15t-vendor="…"`, and iframes that carry `data-vendor`.
