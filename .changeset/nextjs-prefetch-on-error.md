---
"@c15t/nextjs": patch
---

Stop swallowing `prefetchInitialConsent` failures silently. A new `onError` option receives the error when the `/init` or manifest request fails; without it, the helper logs one `console.warn` line naming the URL and the error message outside production. Either way it still returns the baseline config so the page renders and the client retries on mount.
