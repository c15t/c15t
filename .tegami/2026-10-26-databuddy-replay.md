---
packages:
  "@c15t/integrations": minor
---

### Record Databuddy sessions with the `replay` option

`databuddy({ clientId: 'YOUR_CLIENT_ID', replay: true })` loads Databuddy's
session replay recorder, `replay.js`, while measurement is allowed. Recordings
mask page text and typed input. Pass `replay: { maskText: false }` to record
page text on pages that show no personal data, or `recordIframes: true` to
record your own embedded pages. On revocation the helper calls
`window.databuddyReplay.stop()` and removes the script, so recording stops
without waiting for a page reload.
Remove any `replay.js` script you registered yourself. See the
[Databuddy guide](https://c15t.com/docs/integrations/databuddy).
