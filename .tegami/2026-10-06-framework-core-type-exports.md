---
packages:
  '@c15t/react': minor
  '@c15t/nextjs': minor
  '@c15t/tanstack-start': minor
  '@c15t/vue': minor
  '@c15t/svelte': minor
  '@c15t/astro': minor
  c15t: minor
---

### Export category, cleanup and policy types from the framework entries

`c15t/react`, `c15t/next` and `c15t/tanstack-start` now export the
`AllConsentNames`, `ClearOnRevocationConfig` and `PolicyRule` types and the
`policyRulePresets` builder, so the values you pass to `consentCategories`,
`clearOnRevocation` and `offline({ policyRules })` can be typed from the same
import as the provider. `@c15t/svelte` adds `ClearOnRevocationConfig`,
`PolicyRule` and `policyRulePresets`, `c15t/astro` adds
`ClearOnRevocationConfig`, and `c15t/vue` adds `AllConsentNames` and
`ClearOnRevocationConfig`. Importing them from `c15t` keeps working.
