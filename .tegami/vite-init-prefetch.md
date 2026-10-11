---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  "@c15t/cli":
    replay:
      - exit-prerelease(npm:@c15t/cli)
---

### Send `/init` before a Vite app's JavaScript loads

`consentManifest({ initPrefetch: true })` adds an inline script to
`index.html` that sends the `/init` request while the browser downloads the
app's JavaScript. `hosted()` uses that response instead of sending its own, so
the page still makes one request. Pass `{ credentials, journey, storageKey }`
when the app sets them. The plugin leaves the script out and warns when the
build bundles the snapshot, uses `source: 'runtime'`, or renders on the
server. Set Vite's `html.cspNonce` to stamp a nonce on it.

The CLI's React, Vue and Svelte single-page setups now use `hosted()` with
`initPrefetch`.
