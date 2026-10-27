---
packages:
  "@c15t/integrations":
    replay:
      - exit-prerelease(npm:@c15t/integrations)
  "@c15t/cli":
    replay:
      - exit-prerelease(npm:@c15t/cli)
  "@c15t/scripts":
    replay:
      - exit-prerelease(npm:@c15t/scripts)
---

### Add Customer.io integration

`customerIo` from `@c15t/integrations/customer-io` loads Customer.io Data Pipelines after `marketing` consent. Withdrawing consent clears the stored identity with `reset()` and reloads the page, because `reset()` does not stop the SDK from sending.
