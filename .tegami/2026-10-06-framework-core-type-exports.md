---
packages:
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Export category, cleanup and policy types from the framework entries

You can type `consentCategories`, `clearOnRevocation` and
`offline({ policyRules })` from the same import as the provider.

- `c15t/react`, `c15t/next` and `c15t/tanstack-start` add `AllConsentNames`,
  `ClearOnRevocationConfig`, `PolicyRule` and `policyRulePresets`.
- `@c15t/svelte` adds `ClearOnRevocationConfig`, `PolicyRule` and
  `policyRulePresets`.
- `c15t/astro` adds `ClearOnRevocationConfig`.
- `c15t/vue` adds `AllConsentNames` and `ClearOnRevocationConfig`.

Importing them from `c15t` keeps working.
