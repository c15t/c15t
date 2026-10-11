---
packages:
  '@c15t/react': patch
---

### Load the consent dialog at first idle

With `preloadDialog: 'idle'` (the default), the deferred `ConsentDialog` starts loading in the browser's first idle period after the page's `load` event, as documented, instead of 3 seconds after it. On Slow 4G, opening the dialog in the first 3 seconds after load no longer waits about 700 ms for its chunk.
