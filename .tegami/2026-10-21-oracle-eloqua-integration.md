---
packages:
  '@c15t/integrations': minor
  '@c15t/cli': patch
  '@c15t/scripts': patch
---

### Add consent-gated Oracle Eloqua loading

Add `eloquaTracking` to load Oracle Eloqua only after marketing consent. Include vendor settings, ordered consent responses across revocation and remount, shared provider permission checks, page tracking after either shared provider's regrant, dispatcher ownership across shared and detached loaders, fresh setup for replacement tags, contained consent dispatch failures with explicit retry, conflicting site/domain blocking, full page URLs, a CLI snippet and setup documentation.
