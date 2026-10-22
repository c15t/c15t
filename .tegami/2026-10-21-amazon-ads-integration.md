---
packages:
  '@c15t/core': patch
  '@c15t/integrations': minor
  '@c15t/cli': patch
  '@c15t/scripts': patch
---

### Add Amazon Ads consent integration

Load Amazon Ads after marketing consent with the `amazonAdsTag` helper, with vendor metadata, framework registration examples and CLI setup.

Remove the c15t-created consent helper and its listeners on final disposal or configuration replacement, while preserving active registrations that share the helper and external helper elements.

Preserve ACS grants across option replacement. Evaluate the outgoing script's current gate, including category overrides and vendor restrictions. Forward denial to a running tag when the incoming configuration selects a denied category. Continue forwarding actual withdrawals and denial when the helper is removed.
