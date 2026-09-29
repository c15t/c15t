---
packages:
  '@c15t/vue': patch
  c15t: patch
---

### Type `nonce`, `iframeBlocker` and `app.config.ts` for Nuxt

The Nuxt module options now accept `nonce` and `iframeBlocker`, which the runtime already read. The `c15t` key of `app.config.ts` is now typed, including when the module is registered as `c15t/vue`, and accepts `networkBlocker.onRequestBlocked`. Module options pass through JSON and cannot hold that callback, so set it in `app.config.ts`.
