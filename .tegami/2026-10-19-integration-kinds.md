---
packages:
  '@c15t/integrations': major
  '@c15t/scripts': major
  '@c15t/cli': patch
---

### Group built-in integrations by kind of tool

**Breaking.** `IntegrationCategory` in `@c15t/integrations/registry` now names
the kind of tool, the same groups the integrations docs use. The compatibility
export `@c15t/scripts/registry` exposes the same change:
`web-analytics`, `product-analytics`, `replay-and-monitoring`,
`experimentation-and-personalization`, `ads-and-growth`, `data-and-tags` and
`chat-and-embeds`. It replaces
`analytics`, `ads-and-pixels`, `email-and-sms`, `functional` and
`tag-manager`. `BUILT_IN_INTEGRATION_CATEGORIES` lists the new groups and
labels in display order, and each entry's `integrationCategory` uses them.

Consent categories and loading behavior do not change. `consentCategory`
still identifies each helper's default consent category or condition.

The `c15t generate` script picker orders integrations by the new categories.
