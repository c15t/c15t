---
packages:
  '@c15t/integrations': minor
  '@c15t/cli': patch
  '@c15t/scripts': patch
---

### Add Customer.io integration

`customerIo` from `@c15t/integrations/customer-io` loads Customer.io Data Pipelines after `marketing` consent. Withdrawing consent clears the stored identity with `reset()` and reloads the page, because `reset()` does not stop the SDK from sending.
