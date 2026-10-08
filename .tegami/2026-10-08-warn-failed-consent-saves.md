---
packages:
  '@c15t/core': patch
---

### Report failed and dropped consent saves

Development builds log a `[c15t]` warning when a save is queued for retry, a
replay fails, or a save is dropped. A queued save dropped after 10 attempts,
7 days or a refusal now reaches `onError`.
