---
packages:
  '@c15t/integrations': minor
  '@c15t/scripts': minor
  '@c15t/cli': patch
---

### Group built-in integrations by kind of tool

Add `IntegrationKind`, `BUILT_IN_INTEGRATION_KINDS` and an `integrationKind`
field on built-in registry entries for the groups used in the integrations
docs: web analytics, product analytics, replay and monitoring, experimentation
and personalization, ads and growth, data and tags, and chat and embeds.
These additions are also available through `@c15t/scripts/registry`.

The existing `IntegrationCategory` type, `BUILT_IN_INTEGRATION_CATEGORIES`
list and each entry's `integrationCategory` keep their v3 values. Consent
categories and loading behavior are unchanged.

The `c15t generate` script picker orders integrations by the new kinds.
