---
packages:
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
---

### Reload the page when a visitor revokes consent

Revoking consent removed a vendor's script but left its code running until
the next page load. As in v2, when an accept, reject or save turns off a
granted category or vendor, the page reloads once in-flight saves settle.
`onBeforeConsentRevocationReload` runs just before. Rejecting on a first
opt-in visit does not reload. Rejecting opt-out defaults does. Expiry, policy
changes and privacy signals never reload.

Set `reloadOnConsentRevoked: false` to turn it off. It works on
`ConsentProvider`, `ConsentRoot` `options`, `createConsentRuntime()`, the Vue
plugin, the browser client, the Astro integration and `@c15t/svelte`'s
runtime options.
