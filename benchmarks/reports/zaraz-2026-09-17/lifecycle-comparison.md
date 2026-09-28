# Benchmark Regression Report

Generated at: 2026-09-17T20:13:23.856Z

Base: 4382dcddb6c6a3fad15cc6503a489b6274c59ad1 | Head: 3822b56ad6190d11738afd266ef82d84efe38b5d

## Summary

- Profile: regression | Enforcement: on | Result: pass
- Results: 6/6 expected results compared; missing head 0; missing base 0; unexpected 0
- Budgets: 12 passed, 0 failed, 0 missing head metric, 0 missing base metric, 0 unevaluated (arm), 0 missing definitions, 0 definition mismatches of 12 expected

## @c15t/script-lifecycle-bench :: always-load-retain

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| alwaysLoadRetentionMs | 24.5 | 26 | 1.5 | 6.122 |
| loadedScriptCount | 1 | 1 | 0 | 0 |
| unloadedScriptCount | 1 | 1 | 0 | 0 |
| retainedDomScriptCount | 1 | 1 | 0 | 0 |
| callbackLoadCount | 0 | 0 | 0 | n/a |
| callbackConsentChangeCount | 0 | 0 | 0 | n/a |
| errorCount | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| alwaysLoadRetentionMs | evaluated | yes | alwaysLoadRetentionMs changed by 1.50 (6.12%) |
| errorCount | evaluated | yes | errorCount matched expected value 0 |

Notes:
- Script lifecycle benchmark uses local fixture scripts and predicate-based completion checks.
- IAB-gated script lifecycle scenarios are intentionally excluded from v1.

## @c15t/script-lifecycle-bench :: callback-only-toggle

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| callbackOnlyToggleMs | 29.6 | 26.7 | -2.9 | -9.797 |
| loadedScriptCount | 1 | 1 | 0 | 0 |
| unloadedScriptCount | 0 | 0 | 0 | n/a |
| retainedDomScriptCount | 0 | 0 | 0 | n/a |
| callbackLoadCount | 1 | 1 | 0 | 0 |
| callbackConsentChangeCount | 0 | 0 | 0 | n/a |
| errorCount | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| callbackOnlyToggleMs | evaluated | yes | callbackOnlyToggleMs changed by -2.90 (-9.80%) |
| errorCount | evaluated | yes | errorCount matched expected value 0 |

Notes:
- Script lifecycle benchmark uses local fixture scripts and predicate-based completion checks.
- IAB-gated script lifecycle scenarios are intentionally excluded from v1.

## @c15t/script-lifecycle-bench :: grant-standard

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| grantStandardLifecycleMs | 30.1 | 26.7 | -3.4 | -11.296 |
| loadedScriptCount | 3 | 3 | 0 | 0 |
| unloadedScriptCount | 0 | 0 | 0 | n/a |
| retainedDomScriptCount | 3 | 3 | 0 | 0 |
| callbackLoadCount | 0 | 0 | 0 | n/a |
| callbackConsentChangeCount | 0 | 0 | 0 | n/a |
| errorCount | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| grantStandardLifecycleMs | evaluated | yes | grantStandardLifecycleMs changed by -3.40 (-11.30%) |
| errorCount | evaluated | yes | errorCount matched expected value 0 |

Notes:
- Script lifecycle benchmark uses local fixture scripts and predicate-based completion checks.
- IAB-gated script lifecycle scenarios are intentionally excluded from v1.

## @c15t/script-lifecycle-bench :: persist-after-revoked

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| persistAfterRevokedMs | 24.5 | 25 | 0.5 | 2.041 |
| loadedScriptCount | 0 | 0 | 0 | n/a |
| unloadedScriptCount | 1 | 1 | 0 | 0 |
| retainedDomScriptCount | 1 | 1 | 0 | 0 |
| callbackLoadCount | 0 | 0 | 0 | n/a |
| callbackConsentChangeCount | 0 | 0 | 0 | n/a |
| errorCount | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| persistAfterRevokedMs | evaluated | yes | persistAfterRevokedMs changed by 0.50 (2.04%) |
| errorCount | evaluated | yes | errorCount matched expected value 0 |

Notes:
- Script lifecycle benchmark uses local fixture scripts and predicate-based completion checks.
- IAB-gated script lifecycle scenarios are intentionally excluded from v1.

## @c15t/script-lifecycle-bench :: reload-single

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| reloadSingleScriptMs | 24.4 | 24.4 | 0 | 0 |
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
| revokeStandardLifecycleMs | 30.5 | 31.9 | 1.4 | 4.59 |
| loadedScriptCount | 0 | 0 | 0 | n/a |
| unloadedScriptCount | 3 | 3 | 0 | 0 |
| retainedDomScriptCount | 0 | 0 | 0 | n/a |
| callbackLoadCount | 0 | 0 | 0 | n/a |
| callbackConsentChangeCount | 0 | 0 | 0 | n/a |
| errorCount | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| revokeStandardLifecycleMs | evaluated | yes | revokeStandardLifecycleMs changed by 1.40 (4.59%) |
| errorCount | evaluated | yes | errorCount matched expected value 0 |

Notes:
- Script lifecycle benchmark uses local fixture scripts and predicate-based completion checks.
- IAB-gated script lifecycle scenarios are intentionally excluded from v1.

