---
packages:
  '@c15t/integrations': minor
  '@c15t/cli': patch
  '@c15t/scripts': patch
---

### Add consent-gated ActiveCampaign loading

Add `activeCampaignTracking` to load ActiveCampaign only after marketing consent. Include vendor settings, consent lifecycle handling, a CLI snippet and setup documentation.

Load the Diffuser SDK directly from ActiveCampaign's CDN by default, bypassing the broken `prism.js` redirect. Send one `process('allowTracking')` call after initial load and another on same-page regrant. Keep reload on withdrawal enabled because the SDK has no documented stop command.
