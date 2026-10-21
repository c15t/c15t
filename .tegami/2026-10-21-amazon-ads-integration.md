---
packages:
  '@c15t/integrations': minor
  '@c15t/cli': patch
  '@c15t/scripts': patch
---

### Add Amazon Ads consent integration

Load Amazon Ads after marketing consent with the `amazonAdsTag` helper, with vendor metadata, framework registration examples and CLI setup.

Remove the c15t-created consent helper and its listeners on final disposal or configuration replacement, while preserving active registrations that share the helper and external helper elements.
