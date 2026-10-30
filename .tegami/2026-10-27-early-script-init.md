---
packages:
  '@c15t/backend': minor
  '@c15t/browser': minor
---

### The script tag starts `/init` sooner

`/c15t.js` from `@c15t/backend` now sends the visitor's `/init` before its
bundle runs, instead of after. A new `/c15t.init.js` route sends the same
request from an `async` tag placed before `/c15t.js`, so it starts while
`c15t.js` downloads. On a bare test page at 200 KB/s with 4x CPU slowdown, the
banner showed about 110 ms sooner with `/c15t.js` alone and about 300 ms sooner
with both tags. On an article page whose own content competes for the same
bandwidth, the gains were about 70 ms and 125 ms.

Pages that set a location, language, backend or mode on the tag, or queue
`overrides`, `experiment` or `storageConfig`, keep the old behavior. Set
`script.prefetch: false` to turn both off. `script.initPath` changes the new
route's path.

`@c15t/browser/prefetch` re-exports `buildPrefetchScript` from the
`@c15t/core` its script-tag builds bundle, so a server that serves `c15t.js`
builds the early request with the same version.
