---
'c15t': patch
---

Preserve choices saved while the consent store is starting. Read the latest consent state after calculating the policy fingerprint so startup cannot restore an older choice or timestamp in storage.
