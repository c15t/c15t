---
packages:
  "@c15t/integrations":
    replay:
      - exit-prerelease(npm:@c15t/integrations)
  "@c15t/scripts":
    replay:
      - exit-prerelease(npm:@c15t/scripts)
  "@c15t/cli":
    replay:
      - exit-prerelease(npm:@c15t/cli)
---

### Add Insider One integration

`insiderTag` from `@c15t/integrations/insider` loads the Insider One tag after `marketing` consent, with optional user attributes, currency and page context. Withdrawing consent sends `gdpr_optin: false` to Insider and reloads the page.
