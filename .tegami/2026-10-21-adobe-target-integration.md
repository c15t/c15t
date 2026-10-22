---
packages:
  '@c15t/integrations': minor
  '@c15t/scripts': patch
  '@c15t/cli': patch
---

### Add Adobe Target consent integration

`adobeTarget()` loads Adobe Target only after `experience` consent. Includes configuration and revocation guidance, loader contract tests, and CLI setup support.

Web SDK consent updates run one at a time and retry failed updates on later
consent notifications. Shared registrations respect initially denied choices
in both SDK modes.

Web SDK mode requires an exact stable version of 2.21.0 or later so its
datastream configuration is supported. Invalid or older versions log an
error and skip the loader.
