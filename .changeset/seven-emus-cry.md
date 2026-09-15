---
'@c15t/react': patch
---

Remove the Suspense retry delay from the first opening of the default aggregate ConsentDialog. Keep the dialog loaded on demand and reuse the same module for hover or focus preloading and subsequent opens.
