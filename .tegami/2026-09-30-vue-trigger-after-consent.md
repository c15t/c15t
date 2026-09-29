---
packages:
  '@c15t/vue': patch
  c15t: patch
---

### Show the Vue dialog trigger after the prompt under `after-consent`

`triggerShowWhen: 'after-consent'`, the default, now hides the floating `ConsentDialogTrigger` until the policy owes no prompt: a choice is saved or a notice is dismissed. Before, only `'never'` was checked, so the trigger showed next to an unanswered banner. Set `triggerShowWhen: 'always'` to keep it visible while the banner is open.
