---
"@c15t/core": major
"@c15t/react": major
"@c15t/ui": major
---

Separate policy behavior from host presentation and expose a shared synchronous presentation resolver. React notices now use a dedicated local dismiss action, while preference controls remain available before a choice and after the prompt closes.

Seed preference drafts from explicit receipts, preserve masked selections, save only displayed categories, and require review after a material policy change. Replace consent setter callbacks with `onChoiceRecorded` and `onPermissionsChanged`, and use prepared records for read-only SSR hydration.

Move IAB integration to an explicit `IABProvider` import from `@c15t/react/iab`. Migrate policy UI options to `presentation`, offline packs to `offline({ policyRules })`, and `after-consent` triggers to persistent access.
