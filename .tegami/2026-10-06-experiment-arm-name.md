---
packages:
  '@c15t/core': minor
  c15t: minor
---

### Add `ExperimentArmName` for typing a flag's arm

`ExperimentArmName<typeof experiment>` is `'control'` plus the arm names of an
experiment built with `defineExperiment()`. Use it to check a feature flag's
value before passing it as `arm`. Import it from `c15t`.
