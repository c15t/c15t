---
packages:
  "@c15t/integrations":
    replay:
      - exit-prerelease(npm:@c15t/integrations)
---

### Load Databuddy after consent and turn off features you do not use

`databuddy()` now waits for `measurement` consent before it loads
`databuddy.js`, like most c15t analytics helpers. Until the visitor allows
measurement, the page makes no request to Databuddy and Databuddy stores
nothing in the browser. Pass `loadMode: 'always'` to keep loading Databuddy on
every page, as before.

New `features` switches turn Databuddy's interaction tracking, Web Vitals,
error tracking and outgoing link tracking on or off. `configWhenGranted` and
`configWhenDenied` are now optional.

The guide also shows how to load Databuddy's session replay script only with
measurement consent. See the
[Databuddy guide](https://c15t.com/docs/integrations/databuddy).
