---
"c15t": minor
"@c15t/scripts": minor
---

feat(core): move policy action resolution from @c15t/react to c15t core

Policy-driven action resolution utilities (`resolvePolicyAllowedActions`, `resolvePolicyActionGroups`, `resolvePolicyPrimaryActions`, etc.) are now exported from `c15t` core so both `@c15t/react` and `@c15t/embed` can use them.

feat(scripts): rewrite vendor scripts as declarative VendorManifest objects with `resolveManifest()` resolver. New step types: loadScript, setGlobal, callGlobal, pushToDataLayer, inlineScript. Consent signaling support via Google Consent Mode v2.
