---
'c15t': patch
'@c15t/iab': patch
---

Fix IAB TCF in offline mode and on override-driven re-initialization:

- The `iab()` factory now injects `fetchGVL` into the runtime module, so offline mode (and the hosted fallback path) can load the Global Vendor List. Previously the GVL never loaded and the IAB banner silently never rendered in offline mode.
- The GVL is requested with the resolved language (`Accept-Language`), so purpose and feature names match the rest of the consent UI.
- `setOverrides`/`setLanguage` now pass the IAB config through re-initialization, so a language or location change refreshes the GVL instead of keeping a stale one.
