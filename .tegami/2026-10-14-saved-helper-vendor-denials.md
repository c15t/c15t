---
packages:
  '@c15t/core': patch
  '@c15t/react': patch
  '@c15t/vue': patch
  '@c15t/svelte': patch
  '@c15t/browser': patch
  '@c15t/astro': patch
  '@c15t/nextjs': patch
  '@c15t/tanstack-start': patch
  'c15t': patch
---

### Keep saved helper vendor denials accessible

A helper vendor the visitor previously switched off stays visible in the
preference dialog when the site declares no vendors. The visitor can turn that
vendor on without changing any category choices. Its saved denial continues to
block loading until the visitor changes it and saves. Other helper vendors stay
hidden until the site declares a vendor.

The browser dialog updates helper rows when saved vendor consent changes while
it is open.
