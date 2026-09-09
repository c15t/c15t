---
"@c15t/core": patch
"@c15t/nextjs": patch
"@c15t/tanstack-start": patch
---

Unify GVL caching across server and manifest transports. Honor restrictive cache directives, explicit zero lifetimes, and upstream Age. Use a five-second fallback when no lifetime is supplied, and prevent pending requests from repopulating a cleared cache. Next.js init routes now reuse the shared GVL cache.

Validate static manifest export names consistently across Next.js and TanStack. Next.js generated modules now import their manifest type from @c15t/nextjs/static and accept importSource for umbrella-package imports. Share cache-directive parsing so malformed values cannot produce different lifetimes in Next.js and core.
