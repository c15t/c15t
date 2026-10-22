---
packages:
  '@c15t/integrations': minor
  '@c15t/cli': patch
  '@c15t/scripts': patch
---

### Add consent-gated Lucky Orange loading

Add `luckyOrange` to load Lucky Orange only after measurement consent. Include vendor settings, consent lifecycle handling, a CLI snippet and setup documentation.

Report rejected privacy initialization without an unhandled promise rejection or a consent update, including after disposal.
