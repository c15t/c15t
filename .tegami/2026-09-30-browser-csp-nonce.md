---
packages:
  '@c15t/browser': patch
---

### Pass a CSP nonce and the remaining runtime options through `@c15t/browser`

`init()` and `createConsentClient()` accept a `nonce` option. The stock UI's `<style>` element and every `<script>` the `scripts` option loads carry it, so the banner renders under a Content Security Policy that allows styles or scripts by nonce instead of `'unsafe-inline'`. Before, the injected `<style>` element had no nonce and a nonce-based `style-src` blocked the whole stylesheet.

The script tag reads the nonce from `data-nonce`, or from the tag's own `nonce` attribute when `data-nonce` is absent, so `<script nonce="..." src=".../c15t.js">` needs no extra configuration.

With a nonce configured, inert `<script type="text/plain" data-c15t-category>` tags run only when they carry that same nonce. Other tags are skipped with a console warning and marked `data-c15t-activated="untrusted"`. c15t runs an inert tag by creating a new `<script>` element, and a policy with `'strict-dynamic'` runs scripts created by trusted code without checking for a nonce. Without this check, a tag injected through an HTML-injection hole would run as soon as its category was granted, whether it was inline or had a `src`. The configured nonce is never copied onto an inert tag. Add `nonce="..."` to your own gated tags, including ones your code inserts later. Pages without a configured nonce activate inert tags as before. `activateGatedScripts()` takes the same check as a `nonce` option.

The client also passes `vendors`, `persistence` and `scriptLoader` to the consent runtime. Before, all three were ignored.
