---
packages:
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
---

### Pass a CSP nonce through `@c15t/browser`

`init()` and `createConsentClient()` accept a `nonce` option. The stock UI's
`<style>` element and scripts loaded by the `scripts` option carry it, so the
banner works under a nonce-based CSP without `'unsafe-inline'`. The script tag
reads the nonce from `data-nonce` or its own `nonce` attribute.

With a nonce configured, inert `<script type="text/plain" data-c15t-category>`
tags run only when they carry the same nonce. Others are skipped with a console
warning and marked `data-c15t-activated="untrusted"`. Add `nonce="..."` to your
gated tags, including ones your code inserts later. Pages without a nonce behave
as before. `activateGatedScripts()` takes the same `nonce` option.

The client also passes `vendors`, `persistence` and `scriptLoader` to the
consent runtime. They were ignored before.
