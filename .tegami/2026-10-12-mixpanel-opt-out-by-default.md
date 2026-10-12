---
packages:
  '@c15t/integrations': patch
---

### Start Mixpanel visitors opted out

`mixpanelAnalytics()` now passes `opt_out_tracking_by_default: true` and `opt_out_persistence_by_default: true` to `mixpanel.init`. The SDK loads before consent and initializes before the helper's first opt-in or opt-out call. Without these options, that gap let it store queued `track` calls in localStorage and a visitor ID in an `mp_*` cookie. Your `initOptions` are merged over the defaults; pass either option as `false` to restore the old behavior.
