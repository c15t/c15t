---
packages:
  '@c15t/vue': patch
---

### Forward vendors and privacy signals through the Nuxt `/init` proxy

When a backend has no `/manifest`, the Nuxt `/init` route proxies `GET /init` and rebuilds the response. It dropped `vendors`, `vendorListVersion` and `resolvedPrivacySignals` on the way, so a client behind the proxy received no vendor list and none of the privacy signals the backend resolved. The route now forwards all three.
