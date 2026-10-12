---
packages:
  '@c15t/integrations': patch
---

### Start Mixpanel visitors opted out

`mixpanelAnalytics()` now passes `opt_out_tracking_by_default: true` to `mixpanel.init`. The SDK loads before consent and initializes before the helper's first opt-in or opt-out call, so without this option it could set `mp_*` cookies and send queued `track` calls in that gap. Your `initOptions` are merged over the default; pass `opt_out_tracking_by_default: false` to restore the old behavior.
