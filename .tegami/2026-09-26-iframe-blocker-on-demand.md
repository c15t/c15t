---
packages:
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
---

### Load the iframe blocker when a gated iframe is on the page

`ConsentProvider` and `ConsentRoot` load the iframe blocker when the first
iframe with `data-category` or `data-vendor` appears, instead of on every page.
A gated iframe that arrives earlier is still paused until consent allows it.
`iframeBlocker: { disableAutomaticBlocking: true }` and `useIframeBlocker()`
load the blocker at mount as before.
