---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Keep saved helper vendor denials accessible

A helper vendor the visitor previously switched off stays visible in the
preference dialog when the site declares no vendors. The visitor can turn that
vendor on without changing any category choices. Its saved denial continues to
block loading until the visitor changes it and saves. Other helper vendors stay
hidden until the site declares a vendor.

The browser dialog updates helper rows when saved vendor consent changes while
it is open.
