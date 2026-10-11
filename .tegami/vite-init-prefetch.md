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

`consentManifest()` now adds an inline script to `index.html` that sends the
`/init` request while the browser downloads the app's JavaScript. `hosted()`
uses that response instead of sending its own, so the page still makes one
request. It's on by default. Pass `initPrefetch: false` to turn it off, or
`initPrefetch: { credentials, experiment, journey, overrides, storageKey }`
when the app sets those.
The plugin leaves the script out when the build bundles the snapshot, uses
`source: 'runtime'`, or renders on the server. Set Vite's `html.cspNonce` to
stamp a nonce on it.

Without a `journey` option, the early request continues a `'tab'` journey the
tab already holds and otherwise starts a `'page'` one. `hosted()` accepts an
early response for the same journey id even when the scope differs, so a
`journey: 'tab'` app uses it on a tab's first page too.

Given the banner `experiment`, the early request picks the arm the way c15t
does: the arm this browser saw before, otherwise a weighted pick by `split`.
It sends that arm while the visitor has no stored choice, and the runtime
runs it. `buildPrefetchScript()` and `primePrefetchedInitialData()` take the
same `experiment` option. `hosted()` sends its own `/init` when the early
request carried a different arm, or none, so the backend counts each visitor
toward the arm the banner showed.

The CLI's React, Vue and Svelte single-page setups now use `hosted()`.
Offline Vite setups, JavaScript included, pass `initPrefetch: false`, so they
never call a backend URL left in the environment.
