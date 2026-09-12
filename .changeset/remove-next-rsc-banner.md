---
'@c15t/nextjs': major
'c15t': major
---

Remove the experimental `@c15t/nextjs/rsc` entry (`c15t/next/rsc`) and its `RscConsentBanner`, `RscBannerGate` and `RscBannerActions` exports. The Server Component banner shell was a performance experiment that measured no gain over `ConsentBanner` (equal JS bytes and banner paint, slower interaction), and it was never documented. Render `ConsentBanner` inside `ConsentBoundary` instead, imported from `c15t/next` with the umbrella package or from `@c15t/nextjs` with the scoped package; with an awaited `prefetchInitialConsent` result it is already part of the first HTML response. The v3 upgrade guide maps `classNames`, `children`, `RscBannerGate` and `RscBannerActions` to their replacements.
