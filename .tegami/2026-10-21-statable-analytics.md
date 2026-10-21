---
packages:
  '@c15t/integrations': minor
  '@c15t/cli': patch
---

### Add Statable analytics

Load Statable only after measurement consent with the `statableAnalytics`
helper. Configure its numeric site ID, optional loader and ingestion URLs,
and generate the integration through the CLI. The guide covers setup,
browser verification and the reload needed when consent is withdrawn.
