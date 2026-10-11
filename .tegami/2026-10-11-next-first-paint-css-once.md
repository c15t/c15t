---
packages:
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/ui":
    replay:
      - exit-prerelease(npm:@c15t/ui)
---

### Ship the first-paint CSS once on Next.js pages

Next.js pages no longer ship the banner's first-paint CSS twice. The server already renders it into the HTML, so `withConsentManifest` now points browser bundles at a deferred copy that loads only when the banner, trigger or `ConsentGate` first renders in the browser. That takes 9 to 10 KB gzip off first-load JavaScript. FCP and LCP are unchanged.
