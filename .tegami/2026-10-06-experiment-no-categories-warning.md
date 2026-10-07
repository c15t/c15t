---
packages:
  '@c15t/core': patch
  c15t: patch
---

### Warn when an experiment's banner asks about no category

When the banner shows an experiment arm under a policy that asks about no
optional category, accepting or rejecting records a notice acknowledgement
and no choice, so `onChoiceRecorded` never fires and the experiment counts
impressions only. This happens under a permissive rule when the site declares
no categories through `consentCategories`, `scripts` or `vendors`. c15t now
logs a warning outside production the first time it happens.
