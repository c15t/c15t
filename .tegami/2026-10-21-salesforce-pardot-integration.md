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

### Add Salesforce Account Engagement integration

`pardotTracking` from `@c15t/integrations/salesforce-pardot` loads Salesforce Account Engagement (Pardot) after `marketing` consent. In the default consent mode, withdrawing consent calls Pardot's `revokeConsent` and reloads the page.
