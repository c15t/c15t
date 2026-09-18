# Benchmark Regression Report

Generated at: 2026-09-18T11:13:00.764Z

Base: 4382dcddb6c6a3fad15cc6503a489b6274c59ad1 | Head: 119c1f61da23bf33fc6bd11035f1a1eaab6d8e57

## Summary

- Profile: regression | Enforcement: on | Result: fail
- Results: 6/6 expected results compared; missing head 0; missing base 0; unexpected 0
- Budgets: 9 passed, 3 failed, 0 missing head metric, 0 missing base metric, 0 unevaluated (arm), 0 missing definitions, 0 definition mismatches of 12 expected
- FAIL: budget failed @c15t/script-lifecycle-bench:callback-only-toggle:script-lifecycle#callbackOnlyToggleMs: callbackOnlyToggleMs regressed by 5.00 (20.08%)
- FAIL: budget failed @c15t/script-lifecycle-bench:grant-standard:script-lifecycle#grantStandardLifecycleMs: grantStandardLifecycleMs regressed by 8.10 (32.79%)
- FAIL: budget failed @c15t/script-lifecycle-bench:revoke-standard:script-lifecycle#revokeStandardLifecycleMs: revokeStandardLifecycleMs regressed by 9.60 (40.34%)

## @c15t/script-lifecycle-bench :: always-load-retain

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| alwaysLoadRetentionMs | 26.4 | 24.9 | -1.5 | -5.682 |
| loadedScriptCount | 1 | 1 | 0 | 0 |
| unloadedScriptCount | 1 | 1 | 0 | 0 |
| retainedDomScriptCount | 1 | 1 | 0 | 0 |
| callbackLoadCount | 0 | 0 | 0 | n/a |
| callbackConsentChangeCount | 0 | 0 | 0 | n/a |
| errorCount | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| alwaysLoadRetentionMs | evaluated | yes | alwaysLoadRetentionMs changed by -1.50 (-5.68%) |
| errorCount | evaluated | yes | errorCount matched expected value 0 |

Notes:
- Script lifecycle benchmark uses local fixture scripts and predicate-based completion checks.
- IAB-gated script lifecycle scenarios are intentionally excluded from v1.

## @c15t/script-lifecycle-bench :: callback-only-toggle

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| callbackOnlyToggleMs | 24.9 | 29.9 | 5 | 20.08 |
| loadedScriptCount | 1 | 1 | 0 | 0 |
| unloadedScriptCount | 0 | 0 | 0 | n/a |
| retainedDomScriptCount | 0 | 0 | 0 | n/a |
| callbackLoadCount | 1 | 1 | 0 | 0 |
| callbackConsentChangeCount | 0 | 0 | 0 | n/a |
| errorCount | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| callbackOnlyToggleMs | evaluated | no | callbackOnlyToggleMs regressed by 5.00 (20.08%) |
| errorCount | evaluated | yes | errorCount matched expected value 0 |

Notes:
- Script lifecycle benchmark uses local fixture scripts and predicate-based completion checks.
- IAB-gated script lifecycle scenarios are intentionally excluded from v1.

## @c15t/script-lifecycle-bench :: grant-standard

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| grantStandardLifecycleMs | 24.7 | 32.8 | 8.1 | 32.794 |
| loadedScriptCount | 3 | 3 | 0 | 0 |
| unloadedScriptCount | 0 | 0 | 0 | n/a |
| retainedDomScriptCount | 3 | 3 | 0 | 0 |
| callbackLoadCount | 0 | 0 | 0 | n/a |
| callbackConsentChangeCount | 0 | 0 | 0 | n/a |
| errorCount | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| grantStandardLifecycleMs | evaluated | no | grantStandardLifecycleMs regressed by 8.10 (32.79%) |
| errorCount | evaluated | yes | errorCount matched expected value 0 |

Notes:
- Script lifecycle benchmark uses local fixture scripts and predicate-based completion checks.
- IAB-gated script lifecycle scenarios are intentionally excluded from v1.

## @c15t/script-lifecycle-bench :: persist-after-revoked

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| persistAfterRevokedMs | 24.8 | 28.8 | 4 | 16.129 |
| loadedScriptCount | 0 | 0 | 0 | n/a |
| unloadedScriptCount | 1 | 1 | 0 | 0 |
| retainedDomScriptCount | 1 | 1 | 0 | 0 |
| callbackLoadCount | 0 | 0 | 0 | n/a |
| callbackConsentChangeCount | 0 | 0 | 0 | n/a |
| errorCount | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| persistAfterRevokedMs | evaluated | yes | persistAfterRevokedMs changed by 4.00 (16.13%) |
| errorCount | evaluated | yes | errorCount matched expected value 0 |

Notes:
- Script lifecycle benchmark uses local fixture scripts and predicate-based completion checks.
- IAB-gated script lifecycle scenarios are intentionally excluded from v1.

## @c15t/script-lifecycle-bench :: reload-single

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| reloadSingleScriptMs | 22.8 | 26.8 | 4 | 17.544 |
| loadedScriptCount | 1 | 1 | 0 | 0 |
| unloadedScriptCount | 0 | 0 | 0 | n/a |
| retainedDomScriptCount | 1 | 1 | 0 | 0 |
| callbackLoadCount | 0 | 0 | 0 | n/a |
| callbackConsentChangeCount | 0 | 0 | 0 | n/a |
| errorCount | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| reloadSingleScriptMs | evaluated | yes | reloadSingleScriptMs changed by 4.00 (17.54%) |
| errorCount | evaluated | yes | errorCount matched expected value 0 |

Notes:
- Script lifecycle benchmark uses local fixture scripts and predicate-based completion checks.
- IAB-gated script lifecycle scenarios are intentionally excluded from v1.

## @c15t/script-lifecycle-bench :: revoke-standard

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| revokeStandardLifecycleMs | 23.8 | 33.4 | 9.6 | 40.336 |
| loadedScriptCount | 0 | 0 | 0 | n/a |
| unloadedScriptCount | 3 | 3 | 0 | 0 |
| retainedDomScriptCount | 0 | 0 | 0 | n/a |
| callbackLoadCount | 0 | 0 | 0 | n/a |
| callbackConsentChangeCount | 0 | 0 | 0 | n/a |
| errorCount | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| revokeStandardLifecycleMs | evaluated | no | revokeStandardLifecycleMs regressed by 9.60 (40.34%) |
| errorCount | evaluated | yes | errorCount matched expected value 0 |

Notes:
- Script lifecycle benchmark uses local fixture scripts and predicate-based completion checks.
- IAB-gated script lifecycle scenarios are intentionally excluded from v1.

