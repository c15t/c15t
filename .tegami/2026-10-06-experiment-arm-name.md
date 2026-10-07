---
packages:
  '@c15t/core': minor
  c15t: minor
---

### Add `ExperimentArmName` for typing a flag's arm

`ExperimentArmName<typeof experiment>` is `'control'` plus the arm names of
an experiment built with `defineExperiment()`, so the value a feature flag
returns can be checked before it is passed as `arm`. Import it from `c15t`.
