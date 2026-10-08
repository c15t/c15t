---
packages:
  '@c15t/core': patch
---

### Warn when a consent save fails in development

Development builds log a `[c15t]` warning when a failed save is queued for
retry, or when the backend refuses it and it is dropped.
