---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Add `ExperimentArmName` for typing a flag's arm

`ExperimentArmName<typeof experiment>` is `'control'` plus the arm names of an
experiment built with `defineExperiment()`. Use it to check a feature flag's
value before passing it as `arm`. Import it from `c15t`.
