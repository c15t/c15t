---
packages:
  '@c15t/core': minor
  '@c15t/integrations': minor
  '@c15t/cli': patch
  '@c15t/scripts': patch
---

### Add consent-gated ActiveCampaign loading

Add `activeCampaignTracking` to load ActiveCampaign only after marketing consent. Include vendor settings, consent lifecycle handling, a CLI snippet and setup documentation.

Load the Diffuser SDK directly from ActiveCampaign's CDN by default, bypassing the broken `prism.js` redirect. Send one `process('allowTracking')` call after initial load and another on same-page regrant. Keep reload on withdrawal enabled because the SDK has no documented stop command.

Keep one SDK mounted when options change or a registration remounts. Update or clear the email used by future requests without sending another page request. Require a new page for account or loader changes and withhold tracking calls when registrations conflict.

Add opt-in `Script.persistAfterDispose` so integrations whose SDK outlives its registration can retain the original tag and its download completion. Other scripts still remove their owned elements on disposal.
