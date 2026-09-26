---
packages:
  "@c15t/core": minor
  "@c15t/nextjs": patch
---

### Load the hosted init path only when init runs

`ConsentRoot` no longer ships the hosted transport's init code to every page. With server-resolved `state`, the browser never runs init, but the root's first load carried the init request builder, the inline-prefetch reader, request-context headers and the subject-record reviver: about 1.7 KB of gzipped JavaScript in a Next.js App Router app. Saves, identity links and privacy directives now go through a record-only transport, and the init path loads on the first init, which only runs when the provider re-initializes. `POST /subjects` still goes out without waiting for a chunk, with the same body and decision assertion. The same applies to manifest mode's record requests.

`@c15t/core` exports `createHostedRecordTransport()`, the save, identify, subject-read and privacy-directive half of `createHostedTransport()`. `custom()` now lives in its own module, so an app that brings its own transport no longer bundles the hosted transport through it. A hosted transport loads the subject-record reviver on the first `loadSubjectRecord()` call.
