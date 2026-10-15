---
packages:
  '@c15t/integrations': patch
---

### PostHog no longer starts after a refusal that lands mid-download

With `posthog({ loadMode: 'after-consent' })`, a refusal that arrived while
`array.js` was still downloading did not stop PostHog. When the download
finished, PostHog started, sent a `$pageview` and a `/flags` request, and with
`cookieless_mode: 'never'` wrote its cookie and storage.

A refusal now clears PostHog's queued init, so `array.js` starts nothing. If the
visitor allows measurement again on the same page after `array.js` has run,
PostHog starts on the next page load.
