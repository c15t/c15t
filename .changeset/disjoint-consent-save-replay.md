---
"@c15t/core": patch
---

Preserve transport and retry delivery for independent partial consent confirmations. For partially superseded actions, send only the remaining current confirmations. Keep each action's original receipts and timestamp while preventing older responses from replacing a newer subject identity.
