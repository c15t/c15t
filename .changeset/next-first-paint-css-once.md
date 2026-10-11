---
"@c15t/nextjs": patch
"@c15t/react": patch
"@c15t/ui": patch
---

Next.js pages no longer ship the banner's first-paint CSS twice. The server already renders it into the HTML, so `withConsentManifest` now points browser bundles at a deferred copy that loads only when the banner, trigger or `ConsentGate` first renders in the browser. That takes about 10 KB gzip off first-load JavaScript. FCP and LCP are unchanged.
