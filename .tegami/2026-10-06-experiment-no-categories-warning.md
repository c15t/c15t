---
packages:
  '@c15t/core': patch
  c15t: patch
---

### Warn when an experiment's banner asks about no category

When an experiment arm's banner runs under a policy that asks about no optional
category, accepting or rejecting records only a notice acknowledgement.
`onChoiceRecorded` never fires and the experiment counts impressions only. This
happens under a permissive rule when the site declares no categories through
`consentCategories`, `scripts` or `vendors`. c15t logs a warning outside
production the first time it happens.
