---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
---

### `ConsentRoot` starts consented scripts sooner

In Next.js and TanStack Start, `ConsentRoot` starts downloading the script
loader during its first render when stored consent already allows one of its
`scripts`, instead of after hydration. There is nothing to configure.
