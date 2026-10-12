---
packages:
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
---

### Prerender pages that render `ConsentGate`

With Next.js `cacheComponents: true`, `next build` failed on pages that rendered
`ConsentGate` in the prerendered shell, because the gate called `Date.now()` on
the server. Server render and hydration use the snapshot's evaluation time, and
the browser still checks the current time. No `Suspense` boundary is needed.
`useVendorAllowed` gets the same fix.
