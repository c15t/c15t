---
packages:
  '@c15t/integrations': minor
  '@c15t/cli': patch
  '@c15t/scripts': patch
---

### Add Notra web analytics integration

`notraAnalytics` from `@c15t/integrations/notra-analytics` loads Notra's
`notra.js` after `measurement` consent. It loads the builds that
`@usenotra/sdk` 2.0.0 pins, with subresource integrity, and takes the same
`errors`, `hash` and `endpoint` settings as the SDK's `<NotraAnalytics />`.
`notra.js` has no stop call, so keep the default page reload when consent is
withdrawn. The CLI can add it during setup.
