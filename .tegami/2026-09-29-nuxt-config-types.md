---
packages:
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Type more Nuxt module options and `app.config.ts`

The Nuxt module options accept `nonce`, `iframeBlocker`, `storageConfig` and
`domain`. The `c15t` key of `app.config.ts` is typed, including when the
module is registered as `c15t/vue`, and accepts
`networkBlocker.onRequestBlocked`. Set that callback in `app.config.ts`,
because module options pass through JSON.
