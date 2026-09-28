---
'c15t': patch
---

Fix the iframe blocker letting consent-gated iframes load when something else on the page broke it. A node or iframe the page can't read, such as one Firefox reports as "Permission denied to access property", is now skipped instead of throwing and stopping the other iframes from being blocked. An iframe with an invalid or empty `data-category` no longer throws either. It now stays blocked and logs a console warning. Before, it could stop other iframes from being blocked, make the consent store fail to initialize, or make `saveConsents` reject before gated scripts loaded and the consent was sent.
