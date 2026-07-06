---
'c15t': patch
---

Script loader: forward an explicit `async: false` to the injected script element. Dynamically injected scripts are async by default, so vendor helpers documenting synchronous loading (for example legacy Adobe Tags embeds) previously had no effect.
