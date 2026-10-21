---
packages:
  '@c15t/core': patch
  '@c15t/integrations': minor
  '@c15t/cli': patch
  '@c15t/scripts': patch
---

### Add consent-gated FullStory loading

Add `fullStory` to load FullStory only after measurement consent. Preserve v2 Async promises, share consent across equivalent registrations, and resume the retained recorder after disposal and remount. Retry setup interrupted before SDK insertion and reapply remaining owners' consent when a denying registration is removed. Require a page reload to change the organization or endpoints after bootstrap begins. Include vendor settings, a CLI snippet and setup documentation. Complete script loading from the element's source after `onBeforeLoad`, including when an integration removes an unnecessary download. Preserve each shared registration's load and error callbacks when another hook changes the source.
