---
packages:
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Make IAB TCF opt-in for Vue and Nuxt

The Vue plugin and Nuxt module no longer turn on IAB TCF from the policy
alone. Without an `iab` option, `@c15t/iab` and the IAB banner and dialog
never load, no `__tcfapi` is installed, and Nuxt pages stop prefetching them.
On a Nuxt site with no IAB policy, that removes about 13 KB of gzipped
prefetch from every page.

A visitor whose policy uses the `iab` model, on an app without `iab`, now
gets an `IABUnavailableError` (code `C15T_IAB_UNAVAILABLE`) when the backend
sends the vendor list:

> c15t: this visitor's policy uses IAB TCF, but `iab` is not set.

In Nuxt, a server render fails and Nuxt shows its error page; a prerendered
or `ssr: false` page shows the same error page once the browser resolves the
policy. With the Vue plugin, `app.use()` throws when the policy arrives with
`prefetch`, and otherwise the error is thrown as an uncaught error after
`/init` answers. A backend that answers `gvl: null` turns IAB off for the
request, and nothing throws.

If you relied on your policy to show the IAB banner, add `iab: {}`, or
`iab: { cmpId }` when the backend does not send one. In Nuxt, put it under
`c15t` in `nuxt.config.ts`. Set only in `app.config.ts`, IAB still works but
pages do not prefetch the IAB banner and CMP. `iab: false` and
`iab: { enabled: false }` count as unset, so an IAB policy throws there too.
