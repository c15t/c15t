---
packages:
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
---

### Start `/init` from the HTML of Nuxt `ssr: false` pages

On `ssr: false` pages, the Nuxt module writes an inline script into the head
that calls the backend's `/init` while the HTML parses, and the runtime reuses
that response. The script is added only when `manifest` is unset and no
`consentSource`, `customFetch` or `experiment` is configured. It carries
nothing from the request, so prerendered and cached shells can include it.

The script uses `nuxt-security`'s nonce or the `nonce` option. If your Content
Security Policy can't allow it, set the module option `initPrefetch: false`,
or the route rule `c15t: { initPrefetch: false }`.

`buildPrefetchScript` from `@c15t/core` no longer breaks in Nitro server
bundles.
