---
packages:
  '@c15t/core': patch
  '@c15t/browser': patch
---

### Retry consent saves interrupted by navigation

Store explicit choices in the save queue before sending them, so the next page
can retry an interrupted request with its original decision time. Successful
saves and permanent rejections remove queued entries. Clearing consent still
removes pending saves, and newer category choices supersede older ones.
