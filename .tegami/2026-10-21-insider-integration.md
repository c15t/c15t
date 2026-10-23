---
packages:
  '@c15t/integrations': minor
  '@c15t/scripts': patch
  '@c15t/cli': patch
---

### Add Insider One integration

`insiderTag` from `@c15t/integrations/insider` loads the Insider One tag after `marketing` consent, with optional user attributes, currency and page context. Withdrawing consent sends `gdpr_optin: false` to Insider and reloads the page.
