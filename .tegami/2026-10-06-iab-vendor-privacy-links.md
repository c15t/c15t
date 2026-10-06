---
packages:
  '@c15t/iab': patch
  '@c15t/react': patch
  '@c15t/svelte': patch
  '@c15t/vue': patch
---

### Link IAB vendors to their privacy policies

The vendor list in the IAB preference dialog had empty privacy policy links
for every registered vendor. c15t read a `policyUrl` field that GVL v3 vendor
lists no longer have. The links now come from each vendor's `urls[]`, in the
language the dialog shows, with English as the fallback. The legitimate
interest link follows the same language. Lists older than v3 still work
through their `policyUrl` field.

`@c15t/iab/headless` exports `resolveIABVendorUrls(vendor, language)` for
custom preference UIs, and `processGVLForDialog` takes a `language` to pick
the same links.
