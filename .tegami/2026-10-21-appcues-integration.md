---
packages:
  '@c15t/integrations': minor
  '@c15t/cli': minor
  '@c15t/scripts': patch
---

### Add Appcues consent integration

`appcues()` loads Appcues only after `experience` consent. Use `onReady` to identify the current visitor after the asynchronous account loader finishes. Revoking consent suppresses pending readiness callbacks. Includes configuration and revocation guidance, loader contract tests, and CLI setup support.
