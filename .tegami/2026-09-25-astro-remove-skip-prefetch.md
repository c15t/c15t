---
packages:
  '@c15t/astro': patch
---

### Remove `skipPrefetch` from `resolveConsentContext`

`resolveConsentContext` no longer accepts `skipPrefetch`. Pass
`prerendered: true` for a render shared by every visitor. It ignores the
request, leaves visitor state out of the inlined config and still resolves
offline policies at build time.
