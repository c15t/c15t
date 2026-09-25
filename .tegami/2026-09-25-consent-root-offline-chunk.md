---
packages:
  "@c15t/nextjs": patch
  "@c15t/tanstack-start": patch
---

### Load offline mode on demand in ConsentRoot

`ConsentRoot` in `@c15t/nextjs` and `@c15t/tanstack-start` picks its transport at runtime and imported `offline()` statically, so every app that rendered it shipped offline mode's recommended policy-rule pack in its initial client JavaScript, even with a backend URL, where offline mode never runs. `ConsentRoot` now loads offline mode on first init, and only when no backend URL is set. In production builds of each quickstart's setup, initial JavaScript drops by 8,949 bytes (3,560 bytes gzip) on Next.js 16 and by 28,396 bytes (9,759 bytes gzip) on TanStack Start. A root without a backend still resolves the recommended rules, after loading one extra chunk.
