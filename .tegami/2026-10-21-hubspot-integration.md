---
packages:
  '@c15t/integrations': minor
  '@c15t/cli': patch
  '@c15t/scripts': patch
---

### Add HubSpot consent integration

Load HubSpot after marketing consent with the `hubspot` helper, with vendor metadata, framework registration examples and CLI setup.

Request HubSpot cookie revocation when any forwarded grant is withdrawn, then restore remaining consent categories. Validate the region only when the default loader URL is used.

Warn when a non-script element with `id="hs-script-loader"` blocks loading, with instructions to remove or rename the conflicting ID.
