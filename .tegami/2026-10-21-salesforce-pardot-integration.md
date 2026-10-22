---
packages:
  '@c15t/integrations': minor
  '@c15t/cli': patch
  '@c15t/scripts': patch
---

### Add Salesforce Account Engagement integration

`pardotTracking` from `@c15t/integrations/salesforce-pardot` loads Salesforce Account Engagement (Pardot) after `marketing` consent. In the default consent mode, withdrawing consent calls Pardot's `revokeConsent` and reloads the page.
