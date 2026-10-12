---
packages:
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Show the Vue dialog trigger after the prompt under `after-consent`

With `triggerShowWhen: 'after-consent'`, the default, the floating
`ConsentDialogTrigger` stays hidden until a choice is saved or a notice is
dismissed. It used to show next to an unanswered banner. Set
`triggerShowWhen: 'always'` to keep it visible while the banner is open.
