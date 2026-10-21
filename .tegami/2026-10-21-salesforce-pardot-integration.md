---
packages:
  '@c15t/integrations': minor
  '@c15t/cli': patch
  '@c15t/scripts': patch
---

### Add consent-gated Salesforce Account Engagement loading

Add `pardotTracking` to load Salesforce Account Engagement only after marketing consent. Include vendor settings, consent lifecycle handling, a CLI snippet and setup documentation.

Consent mode starts after hydration so the client loader can wait for SDK readiness before enabling tracking. Classic mode supports server-rendered starts.
