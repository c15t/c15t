---
packages:
  '@c15t/iab': patch
  '@c15t/react': patch
  '@c15t/svelte': patch
  '@c15t/vue': patch
---

### Link IAB vendors to their privacy policies

The IAB preference dialog showed empty privacy policy links for every vendor
because GVL v3 dropped the `policyUrl` field. The links now come from each
vendor's `urls[]`, in the dialog's language with English as the fallback.

`@c15t/iab/headless` exports `resolveIABVendorUrls(vendor, language)` for
custom preference UIs, and `processGVLForDialog` takes a `language`.
