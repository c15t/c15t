---
packages:
  '@c15t/core': patch
---

### Browser manifest mode skips the manifest request when the server state has a policy

With `manifest({ resolve: 'browser' })`, the browser used to request
`/manifest` and load the policy resolver (about 20 KB gzipped) on every page
load, even when the server state from `resolveConsent()` already held the
visitor's policy and the browser never used them. Now neither starts until an
init needs them. With a streamed state, they start once it arrives without a
policy.
