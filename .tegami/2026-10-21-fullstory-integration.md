---
packages:
  '@c15t/core': patch
  '@c15t/integrations': minor
  '@c15t/cli': patch
  '@c15t/scripts': patch
---

### Add consent-gated FullStory loading

Add `fullStory` to load FullStory only after measurement consent. Preserve v2 Async promises, share consent across equivalent registrations, and resume the retained recorder after disposal and remount. Record SDK insertion across kernels to avoid a second download when an owner disposes or updates its scripts while another registration denies consent. Retry setup interrupted before SDK insertion and reapply remaining owners' consent when a denying registration is removed. Use `restart` after any helper-issued shutdown, including withdrawal or disposal before the first SDK load completes. Resolve regional FullStory hosts and script paths from the organization ID before downloading; preserve custom proxy endpoints and exact download URL overrides. Share equivalent effective configurations and require a page reload to change the organization or endpoints after bootstrap begins. Include vendor settings, a CLI snippet and setup documentation. Complete script loading from the element's source after `onBeforeLoad`, including when an integration removes an unnecessary download. Preserve each shared registration's load and error callbacks when another hook changes the source.
