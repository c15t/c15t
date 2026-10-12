---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
---

### Load the hosted init path only when init runs

`ConsentRoot` no longer ships the hosted transport's init code to pages that
get server-resolved `state`. That saves about 1.1 KB gzip in a Next.js App
Router app. When the browser does run init, the `/init` request goes out
alongside the chunk request, so the banner doesn't wait an extra round trip.

`@c15t/core` exports `createHostedRecordTransport()`, the save, identify,
subject-read and privacy-directive half of `createHostedTransport()`. An app
that brings its own transport through `custom()` no longer bundles the hosted
transport.
