---
packages:
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
---

### Load offline mode on demand in ConsentRoot

`ConsentRoot` in `@c15t/nextjs` and `@c15t/tanstack-start` loads offline mode
only when no backend URL is set. Apps with a backend no longer ship its
policy-rule pack, saving about 3.5 KB gzip on Next.js 16 and 9.8 KB gzip on
TanStack Start.
