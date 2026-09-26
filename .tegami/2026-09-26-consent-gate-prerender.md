---
packages:
  '@c15t/react': patch
  '@c15t/nextjs': patch
---

### Prerender pages that render `ConsentGate`

With Next.js `cacheComponents: true`, `next build` failed on a page that
rendered `ConsentGate` in its prerendered shell, because the gate called
`Date.now()` during server rendering. The server render and hydration now
evaluate the gate at the snapshot's own evaluation time. In the browser the
gate still checks the current time, so an expired grant never shows the
embed.

The page needs no `Suspense` boundary around `ConsentGate`: a static page
stays static, and its prerendered HTML contains the placeholder instead of
an empty fallback. `useVendorAllowed` gets the same change.
