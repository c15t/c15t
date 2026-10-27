---
packages:
  '@c15t/core': minor
  '@c15t/schema': minor
  '@c15t/react': minor
  '@c15t/vue': minor
  '@c15t/svelte': minor
  '@c15t/browser': minor
  '@c15t/dev-tools': minor
---

### Add optional hosted banner observations

Support gateway-issued browser observation receipts and distinguish visible
pages from rendered banners. Stock React, Vue, Svelte and HTML surfaces report
display evidence only after DOM visibility checks and matching policy and
language validation. Server-rendered pages acquire their own browser receipt
outside the consent initialization path.

Observation delivery uses an ephemeral document ID and the existing consent
journey, adds no persistent identity, and remains inactive without a hosted
gateway capability. Requests have bounded retries and timeouts; disposal
removes listeners and cancels receipt acquisition. Custom interfaces can use
the core visibility helper and kernel report method. Devtools distinguishes
the rendered-surface event from prompt intent.
