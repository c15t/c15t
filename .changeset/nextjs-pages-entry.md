---
"@c15t/nextjs": minor
---

Add `@c15t/nextjs/pages` for the Pages Router. `readInitialConsentConfig(req, options?)` and `prefetchInitialConsent({ req, ...options })` take the Node `req` from `getServerSideProps` and return a plain-JSON `KernelConfig` for `ConsentBoundary`; `createPagesApiHandlers(options)` returns `init` and `manifest` handlers that take a `pages/api` route's `req`/`res` and bridge them to the App Router route handlers from `@c15t/nextjs/api`. The `request` adapter option on the `@c15t/nextjs/server` helpers is now public (`NextRequestContext`), so custom servers can supply their own request context too.
