---
"@c15t/tanstack-start": minor
"c15t": minor
---

feat(tanstack-start): add TanStack Start adapter

New `@c15t/tanstack-start` package (also available as `c15t/tanstack-start`) with the same role `@c15t/nextjs` has for Next.js:

- `ConsentBoundary` seeds the React provider from loader data and defaults init to the same-origin `/api/c15t/init` route with decision-input assertion on save.
- `@c15t/tanstack-start/server` exports `readInitialConsentConfig`, `prefetchInitialConsent`, `createConsentConfigHandler`, and `consentLoaderOptions` for a root route loader that resolves the first paint from the cached consent manifest without a self-fetch.
- `@c15t/tanstack-start/api` exports `createConsentServerRoute` (plus `GET`, `manifestGET`, `initGET`) for `createFileRoute('/api/c15t/$')({ server: { handlers } })`: cached manifest passthrough with ETag and 304 support, and in-process init resolution.
- `@c15t/tanstack-start/middleware` exports `consentRequestMiddleware` for `createStart({ requestMiddleware })`, normalizing CDN geo, language, and GPC headers and exposing them as `context.consent`.
- `@c15t/tanstack-start/static` ships the strictest-policy-first helpers for prerendered builds, and `consentPrefetchHead` returns a `head()` fragment that starts the init prefetch before hydration.
