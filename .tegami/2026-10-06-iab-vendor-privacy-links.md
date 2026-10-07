---
packages:
  "@c15t/iab":
    replay:
      - exit-prerelease(npm:@c15t/iab)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
---

### Link IAB vendors to their privacy policies

The IAB preference dialog showed empty privacy policy links for every vendor
because GVL v3 dropped the `policyUrl` field. The links now come from each
vendor's `urls[]`, in the dialog's language with English as the fallback.

`@c15t/iab/headless` exports `resolveIABVendorUrls(vendor, language)` for
custom preference UIs, and `processGVLForDialog` takes a `language`.
