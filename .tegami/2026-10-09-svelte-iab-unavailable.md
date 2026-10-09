---
packages:
  '@c15t/svelte': minor
---

### Throw when an IAB policy reaches a provider without `iab`

When a visitor's policy used the `iab` model and the backend sent its vendor
list, `ConsentManagerProvider` without `iab` ran the IAB model with no CMP to
answer for it. It now throws an `IABUnavailableError` (code
`C15T_IAB_UNAVAILABLE`) while rendering, on the server and in the browser.
Set `iab` on the provider and render `IABConsentBanner`, or remove the `iab`
model from the policy. A backend that answers `gvl: null` turns IAB off for
the request, and nothing throws.
