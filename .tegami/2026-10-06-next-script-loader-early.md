---
packages:
  "@c15t/core": patch
  "@c15t/react": patch
  "@c15t/nextjs": patch
  "@c15t/tanstack-start": patch
---

### `ConsentRoot` starts consented scripts sooner

In Next.js and TanStack Start, `ConsentRoot` starts downloading the script
loader during its first render when stored consent already allows one of its
`scripts`, instead of after hydration. There is nothing to configure.
