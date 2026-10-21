---
packages:
  '@c15t/integrations': minor
  '@c15t/scripts': patch
  '@c15t/cli': patch
---

### Add Insider consent integration

`insiderTag()` loads Insider only after `marketing` consent. Includes configuration and revocation guidance, loader contract tests, and CLI setup support.

Supports the documented optional product attributes. Purchase setup requires a durable per-order guard so confirmation-page revisits do not enqueue the same order again.
