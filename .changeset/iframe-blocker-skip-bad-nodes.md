---
'c15t': patch
---

Fix the iframe blocker letting consent-gated iframes load when something else on the page broke it. A node the page can't read, such as one Firefox reports as "Permission denied to access property", no longer throws out of the `MutationObserver` and skips the other iframes added with it. An iframe with an invalid `data-category` is now skipped with a console warning instead of throwing. Previously it could stop other iframes from being blocked, make the consent store fail to initialize, or make `saveConsents` reject before gated scripts loaded and the consent was sent.
