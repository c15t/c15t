---
'@c15t/browser': minor
'@c15t/backend': minor
'@c15t/iab': patch
'@c15t/core': patch
---

Add `@c15t/browser/iab` and `c15t.iab.js` with a CMP, TC-string confirmation, and purpose/vendor preference UI. Load the IAB script in place of the ordinary script. Normal and headless browser builds exclude the IAB implementation and stylesheet, enforced during builds.

Expose `saveIAB()` on the browser client and global API. Use the existing CMP for accept, reject, individual choices, and persistence. Keep confirmation disabled when an IAB policy cannot load its vendor list. Serve the optional build from the backend's `/c15t.iab.js` route, configurable through `script.iabPath`.

Add `whenReady()` to the IAB handle and synchronize CMP applicability and display state with policy and UI changes.
