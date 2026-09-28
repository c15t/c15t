# Benchmark Regression Report

Generated at: 2026-09-18T11:14:52.250Z

Base: 4382dcddb6c6a3fad15cc6503a489b6274c59ad1 | Head: b35f87427c419528f6eee55eaecfc5f2fcc3b3d1

## Summary

- Profile: regression | Enforcement: on | Result: pass
- Results: 6/6 expected results compared; missing head 0; missing base 0; unexpected 0
- Budgets: 12 passed, 0 failed, 0 missing head metric, 0 missing base metric, 0 unevaluated (arm), 0 missing definitions, 0 definition mismatches of 12 expected

## @c15t/script-lifecycle-bench :: always-load-retain

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| alwaysLoadRetentionMs | 24 | 24.1 | 0.1 | 0.417 |
| loadedScriptCount | 1 | 1 | 0 | 0 |
| unloadedScriptCount | 1 | 1 | 0 | 0 |
| retainedDomScriptCount | 1 | 1 | 0 | 0 |
| callbackLoadCount | 0 | 0 | 0 | n/a |
| callbackConsentChangeCount | 0 | 0 | 0 | n/a |
| errorCount | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| alwaysLoadRetentionMs | evaluated | yes | alwaysLoadRetentionMs changed by 0.10 (0.42%) |
| errorCount | evaluated | yes | errorCount matched expected value 0 |

Notes:
- Script lifecycle benchmark uses local fixture scripts and predicate-based completion checks.
- IAB-gated script lifecycle scenarios are intentionally excluded from v1.

## @c15t/script-lifecycle-bench :: callback-only-toggle

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| callbackOnlyToggleMs | 24.8 | 24.4 | -0.4 | -1.613 |
| loadedScriptCount | 1 | 1 | 0 | 0 |
| unloadedScriptCount | 0 | 0 | 0 | n/a |
| retainedDomScriptCount | 0 | 0 | 0 | n/a |
| callbackLoadCount | 1 | 1 | 0 | 0 |
| callbackConsentChangeCount | 0 | 0 | 0 | n/a |
| errorCount | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| callbackOnlyToggleMs | evaluated | yes | callbackOnlyToggleMs changed by -0.40 (-1.61%) |
| errorCount | evaluated | yes | errorCount matched expected value 0 |

Notes:
- Script lifecycle benchmark uses local fixture scripts and predicate-based completion checks.
- IAB-gated script lifecycle scenarios are intentionally excluded from v1.

## @c15t/script-lifecycle-bench :: grant-standard

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| grantStandardLifecycleMs | 24.6 | 24.8 | 0.2 | 0.813 |
| loadedScriptCount | 3 | 3 | 0 | 0 |
| unloadedScriptCount | 0 | 0 | 0 | n/a |
| retainedDomScriptCount | 3 | 3 | 0 | 0 |
| callbackLoadCount | 0 | 0 | 0 | n/a |
| callbackConsentChangeCount | 0 | 0 | 0 | n/a |
| errorCount | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| grantStandardLifecycleMs | evaluated | yes | grantStandardLifecycleMs changed by 0.20 (0.81%) |
| errorCount | evaluated | yes | errorCount matched expected value 0 |

Notes:
- Script lifecycle benchmark uses local fixture scripts and predicate-based completion checks.
- IAB-gated script lifecycle scenarios are intentionally excluded from v1.

## @c15t/script-lifecycle-bench :: persist-after-revoked

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| persistAfterRevokedMs | 23.9 | 23.9 | 0 | 0 |
| loadedScriptCount | 0 | 0 | 0 | n/a |
| unloadedScriptCount | 1 | 1 | 0 | 0 |
| retainedDomScriptCount | 1 | 1 | 0 | 0 |
| callbackLoadCount | 0 | 0 | 0 | n/a |
| callbackConsentChangeCount | 0 | 0 | 0 | n/a |
| errorCount | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| persistAfterRevokedMs | evaluated | yes | persistAfterRevokedMs changed by 0.00 (0.00%) |
| errorCount | evaluated | yes | errorCount matched expected value 0 |

Notes:
- Script lifecycle benchmark uses local fixture scripts and predicate-based completion checks.
- IAB-gated script lifecycle scenarios are intentionally excluded from v1.

## @c15t/script-lifecycle-bench :: reload-single

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| reloadSingleScriptMs | 22.1 | 22.6 | 0.5 | 2.262 |
| loadedScriptCount | 1 | 1 | 0 | 0 |
| unloadedScriptCount | 0 | 0 | 0 | n/a |
| retainedDomScriptCount | 1 | 1 | 0 | 0 |
| callbackLoadCount | 0 | 0 | 0 | n/a |
| callbackConsentChangeCount | 0 | 0 | 0 | n/a |
| errorCount | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| reloadSingleScriptMs | evaluated | yes | reloadSingleScriptMs changed by 0.50 (2.26%) |
| errorCount | evaluated | yes | errorCount matched expected value 0 |

Notes:
- Script lifecycle benchmark uses local fixture scripts and predicate-based completion checks.
- IAB-gated script lifecycle scenarios are intentionally excluded from v1.

## @c15t/script-lifecycle-bench :: revoke-standard

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| revokeStandardLifecycleMs | 24.6 | 23.7 | -0.9 | -3.659 |
| loadedScriptCount | 0 | 0 | 0 | n/a |
| unloadedScriptCount | 3 | 3 | 0 | 0 |
| retainedDomScriptCount | 0 | 0 | 0 | n/a |
| callbackLoadCount | 0 | 0 | 0 | n/a |
| callbackConsentChangeCount | 0 | 0 | 0 | n/a |
| errorCount | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| revokeStandardLifecycleMs | evaluated | yes | revokeStandardLifecycleMs changed by -0.90 (-3.66%) |
| errorCount | evaluated | yes | errorCount matched expected value 0 |

Notes:
- Script lifecycle benchmark uses local fixture scripts and predicate-based completion checks.
- IAB-gated script lifecycle scenarios are intentionally excluded from v1.

