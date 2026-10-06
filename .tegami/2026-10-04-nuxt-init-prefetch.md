---
packages:
  "@c15t/vue": minor
  "c15t": minor
  "@c15t/core": patch
---

### Start `/init` from the HTML of Nuxt `ssr: false` pages

On a page Nuxt sends as a shell (`ssr: false` for the app or the route), the
module now writes a small inline script into the page head that calls the
backend's `/init` while the browser is still parsing the HTML. When the app's
JavaScript has loaded, the consent runtime uses that response instead of
sending its own request. Before, the request waited for the app's JavaScript
to download and run.

The script is added only when `manifest` is unset and no `consentSource`,
`customFetch` or `experiment` is configured. It carries the backend URL and
nothing from the request, so prerendered and cached shells can include it.
Server-rendered pages are unchanged.

The script takes `nuxt-security`'s per-request nonce, or the `nonce` option.
Set the new module option `initPrefetch: false` to turn it off, for example
when your Content Security Policy cannot allow it, or the route rule
`c15t: { initPrefetch: false }` to turn it off for some routes.

`buildPrefetchScript` from `@c15t/core` now works in server bundles built by
Nitro. Nitro rewrote `typeof window` inside the script's text, so the script
returned before it sent any request.
