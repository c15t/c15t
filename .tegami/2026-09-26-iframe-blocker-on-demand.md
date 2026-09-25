---
packages:
  "@c15t/react": patch
---

### Load the iframe blocker when a gated iframe is on the page

`ConsentProvider`, and `ConsentRoot` through it, downloaded and started the iframe blocker on every page, including pages without an iframe to gate. It now loads when the first iframe with `data-category` or `data-vendor` is on the page. Until it runs, such an iframe that arrives with a `src` consent does not allow is paused the way the blocker pauses it. In a Next.js 16 production build of the App Router setup with no gated iframes, first-load JavaScript drops by 3,681 bytes (1,572 bytes gzip) and one request. `iframeBlocker: { disableAutomaticBlocking: true }` and `useIframeBlocker()` load the blocker at mount as before.
