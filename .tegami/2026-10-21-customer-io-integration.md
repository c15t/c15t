---
packages:
  '@c15t/integrations': minor
  '@c15t/cli': patch
  '@c15t/scripts': patch
---

### Add consent-gated Customer.io loading

Add `customerIo` to load Customer.io only after marketing consent. Preserve chained calls while the SDK downloads. Send the initial page after SDK loading without waiting for destination readiness. Support a CDN proxy through `cdnUrl`, with separate collection routing through vendor loader options. Publish callable queue and loaded-SDK types with their respective return values. Report the same CDN origin error for malformed URLs and unsupported origins. Include consent lifecycle handling, a CLI snippet and standalone setup examples.
