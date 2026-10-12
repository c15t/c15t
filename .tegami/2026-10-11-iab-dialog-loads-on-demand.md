---
packages:
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
---

### Load the IAB consent dialog on demand

`IABConsentDialog` from `@c15t/react/iab` now loads on demand, like `ConsentDialog`. The preference center leaves first-load JavaScript (28 KB gzip smaller in a Vite app, 40 KB in a Next.js app) and downloads in the browser's first idle period after `load` while the IAB banner is shown, on hover or focus of the banner's Customize button or partners link, or when it opens. A visitor who opens it before the download finishes waits for it. `preloadDialog: 'intent'` skips the idle download, and nothing downloads under a policy model the dialog's `models` prop does not list.
