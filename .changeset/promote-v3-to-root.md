---
"c15t": major
"@c15t/core": major
"@c15t/react": major
"@c15t/nextjs": major
"@c15t/iab": major
"@c15t/ui": major
"@c15t/vue": major
"@c15t/svelte": major
"@c15t/scripts": major
"@c15t/dev-tools": major
"@c15t/cli": major
---

Promote the v3 kernel to the package root and remove the v2 engine.

The `/v3` subpaths are gone. Import from the package root instead:

- `@c15t/core/v3` → `@c15t/core`, `@c15t/core/v3/modules/*` → `@c15t/core/modules/*`, `@c15t/core/v3/transports` → `@c15t/core/transports`
- `@c15t/react/v3` → `@c15t/react`, `@c15t/react/v3/*` → `@c15t/react/*`
- `@c15t/nextjs/v3` → `@c15t/nextjs`, `@c15t/nextjs/v3/*` → `@c15t/nextjs/*`
- `@c15t/iab/v3` → `@c15t/iab`, `@c15t/iab/v3/headless` → `@c15t/iab/headless`
- `@c15t/ui/styles/v3/*` → `@c15t/ui/styles/components/*`
- `c15t/v3`, `c15t/react/v3`, `c15t/next/v3` → `c15t`, `c15t/react`, `c15t/next`

The CLI now generates `ConsentProvider` setup with `hosted()`, `offline()`, or
`custom()` transports and uses `prefetchInitialConsent` for Next.js server
prefetching.

Removed with the v2 engine: `configureConsentManager`, `createConsentManagerStore`, `ConsentManagerProvider` and `@c15t/react/v3/compat`, `ConsentStoreState`, `ConsentManagerInterface`, `@c15t/react/cookie-banner`, `@c15t/react/components/integrations`, `@c15t/nextjs/components/integrations`, the `store` option on `ConsentProvider`, and the legacy `@c15t/ui/styles/components/*.module.js` CSS modules. `@c15t/core` still exports the shared config types (`Callbacks`, `IABConfig`, `LegalLinks`, `User`, `SSRInitialData`, ...), translation helpers, cookie helpers, and the script debug event registry.
