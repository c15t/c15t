---
packages:
  '@c15t/browser': patch
---

### Pass a CSP nonce and the remaining runtime options through `@c15t/browser`

`init()` and `createConsentClient()` accept a `nonce` option. The stock UI's `<style>` element and every `<script>` the `scripts` option loads carry it, so the banner renders under a Content Security Policy that allows styles or scripts by nonce instead of `'unsafe-inline'`. Before, the injected `<style>` element had no nonce and a nonce-based `style-src` blocked the whole stylesheet.

The script tag reads the nonce from `data-nonce`, or from the tag's own `nonce` attribute when `data-nonce` is absent, so `<script nonce="..." src=".../c15t.js">` needs no extra configuration. Inert `<script type="text/plain" data-c15t-category>` tags keep their own `nonce` and are not given the configured one, because stamping it would let injected markup run as a trusted script.

The client also passes `vendors`, `persistence` and `scriptLoader` to the consent runtime. Before, all three were ignored.
