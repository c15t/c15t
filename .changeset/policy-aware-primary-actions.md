---
'@c15t/ui': patch
'@c15t/react': patch
---

Add a policy-aware `consentActions.primary` theme key. It styles whichever action(s) the active policy marks as primary (`ui.banner.primaryActions`), so the policy decides which action is primary while the theme decides how a primary action looks. Resolution order: explicit props → per-action keys (`accept`/`reject`/`customize`) → `primary` → `default` → fallback.

The IAB consent banner previously hardcoded its button variants, bypassing `consentActions`; it now resolves button treatments through the same logic, keeping its stock styling as the fallback.
