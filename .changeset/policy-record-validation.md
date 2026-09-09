---
'@c15t/backend': patch
'@c15t/core': patch
'@c15t/schema': patch
---

Prevent historical or unreadable server records from restoring superseded grants. Preserve explicit denials when reading legacy history, and distinguish missing legacy receipts from unusable v3 receipts on the wire.

Allow scoped choices to save without reconfirming historical grants outside the current policy scope. Validate explicit no-match assertions against the current manifest so fallback choices can be saved when policy signing is enabled, including after SSR initialization and queued retries.
