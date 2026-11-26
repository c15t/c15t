---
packages:
  "@c15t/integrations":
    replay:
      - exit-prerelease(npm:@c15t/integrations)
  "@c15t/cli":
    replay:
      - exit-prerelease(npm:@c15t/cli)
  "@c15t/scripts":
    replay:
      - exit-prerelease(npm:@c15t/scripts)
---

### Add Notra web analytics integration

`notraAnalytics` from `@c15t/integrations/notra-analytics` loads Notra's
`notra.js` after `measurement` consent. It loads the builds that
`@usenotra/sdk` 2.0.0 pins, with subresource integrity, and takes the same
`errors`, `hash` and `endpoint` settings as the SDK's `<NotraAnalytics />`.
`notra.js` has no stop call, so keep the default page reload when consent is
withdrawn, and add the network blocker rule from the docs to stop its last
report as the page unloads. The CLI can add it during setup.
