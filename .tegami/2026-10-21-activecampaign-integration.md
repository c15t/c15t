---
packages:
  '@c15t/core': minor
  '@c15t/integrations': minor
  '@c15t/cli': patch
  '@c15t/scripts': patch
---

### Add consent-gated ActiveCampaign loading

Add `activeCampaignTracking` to load ActiveCampaign only after marketing consent. Include vendor settings, consent lifecycle handling, a CLI snippet and setup documentation.

Load the Diffuser SDK directly from ActiveCampaign's CDN by default, bypassing the broken `prism.js` redirect. Send one `process('allowTracking')` call after initial load. Require a page reload after a running tracker loses consent and block later helper activation on that page. Keep reload on withdrawal enabled because the SDK has no documented stop command.

Keep one SDK mounted when options change or a registration remounts. Update or clear the email used by future requests without sending another page request. Require a new page for account or loader changes and withhold helper commands when registrations conflict, preserving activation state when a conflict resolves.

Add opt-in `Script.persistAfterDispose` so integrations whose SDK outlives its registration can retain the original tag and its completion, including inline scripts that dispose their loader during execution. Other scripts still remove their owned elements on disposal.
