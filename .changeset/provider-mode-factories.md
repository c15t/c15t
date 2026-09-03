---
"@c15t/core": patch
"@c15t/react": patch
"@c15t/nextjs": patch
---

Replace provider mode strings with `hosted()`, `offline()`, and `custom()` transport factories so hosted bundles no longer include the offline policy runtime. `hosted()` and `custom()` live in `@c15t/core` and are re-exported by the framework adapters.
