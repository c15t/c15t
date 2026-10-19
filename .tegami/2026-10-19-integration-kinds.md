---
packages:
  '@c15t/integrations': minor
  '@c15t/cli': patch
---

### Group built-in integrations by kind of tool

**Breaking.** `IntegrationCategory` in `@c15t/integrations/registry` now names
the kind of tool, the same groups the integrations docs use:
`web-analytics`, `product-analytics`, `replay-and-monitoring`,
`ads-and-growth`, `data-and-tags` and `chat-and-embeds`. It replaces
`analytics`, `ads-and-pixels`, `email-and-sms`, `functional` and
`tag-manager`. `BUILT_IN_INTEGRATION_CATEGORIES` lists the new groups and
labels in display order, and each entry's `integrationCategory` uses them.

Consent categories do not change. `consentCategory` still names the category
each helper waits for.

The `c15t generate` script picker lists integrations in the new groups.
