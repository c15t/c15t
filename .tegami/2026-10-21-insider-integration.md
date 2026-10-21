---
packages:
  '@c15t/integrations': minor
  '@c15t/scripts': patch
  '@c15t/cli': patch
---

### Add Insider consent integration

`insiderTag()` loads Insider only after `marketing` consent. Includes configuration and revocation guidance, loader contract tests, and CLI setup support.

Supports the documented optional product attributes. Purchase setup requires a durable per-order guard so confirmation-page revisits do not enqueue the same order again.

On withdrawal, the helper queues `gdpr_optin: false`, a neutral `other` page and `init` so the withdrawal init does not reuse a purchase page, including one pushed manually during SPA navigation. This does not cancel earlier queued purchases or deduplicate orders. Keep the per-order guard and reload-on-revocation behavior.
