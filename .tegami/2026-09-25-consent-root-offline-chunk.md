---
packages:
  "@c15t/nextjs": patch
---

### Load offline mode on demand in ConsentRoot

`ConsentRoot` picks its transport at runtime and imported `offline()` statically, so every app that rendered it shipped offline mode's recommended policy-rule pack in its initial client JavaScript, even with a `backendURL` or `manifestURL`, where offline mode never runs. `ConsentRoot` now loads offline mode on first init, and only when no backend URL is set. In a Next.js 16 production build of the App Router guide's setup, initial JavaScript drops by 8,949 bytes (3,560 bytes gzip). A root without a backend still resolves the recommended rules, after loading one extra chunk.
