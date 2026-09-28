# Benchmark Regression Report

Generated at: 2026-09-18T11:11:47.326Z

Base: 4382dcddb6c6a3fad15cc6503a489b6274c59ad1 | Head: 119c1f61da23bf33fc6bd11035f1a1eaab6d8e57

## Summary

- Profile: regression | Enforcement: on | Result: fail
- Results: 6/6 expected results compared; missing head 0; missing base 0; unexpected 0
- Budgets: 11 passed, 1 failed, 0 missing head metric, 0 missing base metric, 0 unevaluated (arm), 0 missing definitions, 0 definition mismatches of 12 expected
- FAIL: budget failed @c15t/script-lifecycle-bench:grant-standard:script-lifecycle#grantStandardLifecycleMs: grantStandardLifecycleMs regressed by 9.70 (37.02%)

## @c15t/script-lifecycle-bench :: always-load-retain

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| alwaysLoadRetentionMs | 35.7 | 33.7 | -2 | -5.602 |
| loadedScriptCount | 1 | 1 | 0 | 0 |
| unloadedScriptCount | 1 | 1 | 0 | 0 |
| retainedDomScriptCount | 1 | 1 | 0 | 0 |
| callbackLoadCount | 0 | 0 | 0 | n/a |
| callbackConsentChangeCount | 0 | 0 | 0 | n/a |
| errorCount | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| alwaysLoadRetentionMs | evaluated | yes | alwaysLoadRetentionMs changed by -2.00 (-5.60%) |
| errorCount | evaluated | yes | errorCount matched expected value 0 |

Notes:
- Script lifecycle benchmark uses local fixture scripts and predicate-based completion checks.
- IAB-gated script lifecycle scenarios are intentionally excluded from v1.

## @c15t/script-lifecycle-bench :: callback-only-toggle

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| callbackOnlyToggleMs | 29.2 | 26.7 | -2.5 | -8.562 |
| loadedScriptCount | 1 | 1 | 0 | 0 |
| unloadedScriptCount | 0 | 0 | 0 | n/a |
| retainedDomScriptCount | 0 | 0 | 0 | n/a |
| callbackLoadCount | 1 | 1 | 0 | 0 |
| callbackConsentChangeCount | 0 | 0 | 0 | n/a |
| errorCount | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| callbackOnlyToggleMs | evaluated | yes | callbackOnlyToggleMs changed by -2.50 (-8.56%) |
| errorCount | evaluated | yes | errorCount matched expected value 0 |

Notes:
- Script lifecycle benchmark uses local fixture scripts and predicate-based completion checks.
- IAB-gated script lifecycle scenarios are intentionally excluded from v1.

## @c15t/script-lifecycle-bench :: grant-standard

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| grantStandardLifecycleMs | 26.2 | 35.9 | 9.7 | 37.023 |
| loadedScriptCount | 3 | 3 | 0 | 0 |
| unloadedScriptCount | 0 | 0 | 0 | n/a |
| retainedDomScriptCount | 3 | 3 | 0 | 0 |
| callbackLoadCount | 0 | 0 | 0 | n/a |
| callbackConsentChangeCount | 0 | 0 | 0 | n/a |
| errorCount | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| grantStandardLifecycleMs | evaluated | no | grantStandardLifecycleMs regressed by 9.70 (37.02%) |
| errorCount | evaluated | yes | errorCount matched expected value 0 |

Notes:
- Script lifecycle benchmark uses local fixture scripts and predicate-based completion checks.
- IAB-gated script lifecycle scenarios are intentionally excluded from v1.

## @c15t/script-lifecycle-bench :: persist-after-revoked

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| persistAfterRevokedMs | 32.4 | 24.7 | -7.7 | -23.765 |
| loadedScriptCount | 0 | 0 | 0 | n/a |
| unloadedScriptCount | 1 | 1 | 0 | 0 |
| retainedDomScriptCount | 1 | 1 | 0 | 0 |
| callbackLoadCount | 0 | 0 | 0 | n/a |
| callbackConsentChangeCount | 0 | 0 | 0 | n/a |
| errorCount | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| persistAfterRevokedMs | evaluated | yes | persistAfterRevokedMs changed by -7.70 (-23.77%) |
| errorCount | evaluated | yes | errorCount matched expected value 0 |

Notes:
- Script lifecycle benchmark uses local fixture scripts and predicate-based completion checks.
- IAB-gated script lifecycle scenarios are intentionally excluded from v1.

## @c15t/script-lifecycle-bench :: reload-single

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| reloadSingleScriptMs | 22.6 | 22.6 | 0 | 0 |
| loadedScriptCount | 1 | 1 | 0 | 0 |
| unloadedScriptCount | 0 | 0 | 0 | n/a |
| retainedDomScriptCount | 1 | 1 | 0 | 0 |
| callbackLoadCount | 0 | 0 | 0 | n/a |
| callbackConsentChangeCount | 0 | 0 | 0 | n/a |
| errorCount | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| reloadSingleScriptMs | evaluated | yes | reloadSingleScriptMs changed by 0.00 (0.00%) |
| errorCount | evaluated | yes | errorCount matched expected value 0 |

Notes:
- Script lifecycle benchmark uses local fixture scripts and predicate-based completion checks.
- IAB-gated script lifecycle scenarios are intentionally excluded from v1.

## @c15t/script-lifecycle-bench :: revoke-standard

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| revokeStandardLifecycleMs | 24.5 | 24 | -0.5 | -2.041 |
| loadedScriptCount | 0 | 0 | 0 | n/a |
| unloadedScriptCount | 3 | 3 | 0 | 0 |
| retainedDomScriptCount | 0 | 0 | 0 | n/a |
| callbackLoadCount | 0 | 0 | 0 | n/a |
| callbackConsentChangeCount | 0 | 0 | 0 | n/a |
| errorCount | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| revokeStandardLifecycleMs | evaluated | yes | revokeStandardLifecycleMs changed by -0.50 (-2.04%) |
| errorCount | evaluated | yes | errorCount matched expected value 0 |

Notes:
- Script lifecycle benchmark uses local fixture scripts and predicate-based completion checks.
- IAB-gated script lifecycle scenarios are intentionally excluded from v1.

