---
"@c15t/core": patch
---

Keep consent initialization, hydration, saving, and clearing usable when localStorage access is blocked. Continue using available consent cookies and preserve explicit rejections through hosted failures and recovery.

Preserve in-memory choices, notices, privacy directives, and IAB metadata when storage cannot be read during rehydration.
