---
"@c15t/backend": patch
"@c15t/browser": patch
---

Preserve the configured backend mount path in browser script bundles so initialization and consent saves reach instances mounted below the origin root. Attach queued event listeners before startup restores saved consent, and deliver startup notifications after runtime cleanup is registered so listeners can safely dispose the client.
