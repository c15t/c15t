---
packages:
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
---

### Forward vendors and privacy signals through the Nuxt `/init` proxy

When the backend has no `/manifest`, the Nuxt `/init` route proxies the
backend's `/init`. It dropped `vendors`, `vendorListVersion` and
`resolvedPrivacySignals`, so clients got no vendor list or privacy signals. It
forwards all three.
