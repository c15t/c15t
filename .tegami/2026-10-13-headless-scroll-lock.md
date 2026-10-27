---
packages:
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Lock page scroll from a headless banner

`useScrollLock(shouldLock)` locks page scroll the way the stock banner does
when its policy is blocking. Call it with
`banner.isVisible && banner.blocking` from `useHeadlessConsentUI()`. Locks
are counted, so the page scrolls again once every surface holding one lets
go. Import it from `c15t/react/headless`, `c15t/next/headless` or
`c15t/tanstack-start/headless`.
