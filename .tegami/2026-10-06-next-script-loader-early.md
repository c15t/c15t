---
packages:
  "@c15t/core": patch
  "@c15t/react": patch
  "@c15t/nextjs": patch
  "@c15t/tanstack-start": patch
---

### `ConsentRoot` starts consented scripts sooner

In Next.js and TanStack Start, `ConsentRoot` now starts downloading the script loader during its first render when the visitor's consent already allows one of its `scripts`, instead of after hydration. First visits load it at mount, as before. There is nothing to configure.
