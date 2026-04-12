---
"c15t": minor
"@c15t/scripts": minor
"@c15t/dev-tools": minor
---

feat(core): move policy action resolution from @c15t/react to c15t core

Policy-driven action resolution utilities (`resolvePolicyAllowedActions`, `resolvePolicyActionGroups`, `resolvePolicyPrimaryActions`, etc.) are now exported from `c15t` core for shared consent surface runtimes.

feat(scripts): move bundled integrations to declarative, schema-versioned `VendorManifest` definitions compiled through `resolveManifest()`. The manifest runtime now supports structured startup and consent phases, complex consent conditions, compile caching, and Google Consent Mode v2 signaling without helper-authored lifecycle overrides.

feat(dev-tools): add script lifecycle and manifest runtime telemetry to the events and scripts panels, including grouped activity traces for `onBeforeLoad`, `onLoad`, and `onConsentChange`.
