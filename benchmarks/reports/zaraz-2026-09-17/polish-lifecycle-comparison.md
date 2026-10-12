# Benchmark Regression Report

Generated at: 2026-09-18T08:03:43.644Z

Base: 4382dcddb6c6a3fad15cc6503a489b6274c59ad1 | Head: 4403c2db4798548ebb3b12d394a1c0158437e2d2

## Summary

- Profile: regression | Enforcement: on | Result: pass
- Results: 6/6 expected results compared; missing head 0; missing base 0; unexpected 0
- Budgets: 12 passed, 0 failed, 0 missing head metric, 0 missing base metric, 0 unevaluated (arm), 0 missing definitions, 0 definition mismatches of 12 expected

## @c15t/script-lifecycle-bench :: always-load-retain

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| alwaysLoadRetentionMs | 23 | 23.1 | 0.1 | 0.435 |
| loadedScriptCount | 1 | 1 | 0 | 0 |
| unloadedScriptCount | 1 | 1 | 0 | 0 |
| retainedDomScriptCount | 1 | 1 | 0 | 0 |
| callbackLoadCount | 0 | 0 | 0 | n/a |
| callbackConsentChangeCount | 0 | 0 | 0 | n/a |
| errorCount | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| alwaysLoadRetentionMs | evaluated | yes | alwaysLoadRetentionMs changed by 0.10 (0.43%) |
| errorCount | evaluated | yes | errorCount matched expected value 0 |

Notes:
- Script lifecycle benchmark uses local fixture scripts and predicate-based completion checks.
- IAB-gated script lifecycle scenarios are intentionally excluded from v1.

## @c15t/script-lifecycle-bench :: callback-only-toggle

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| callbackOnlyToggleMs | 23.3 | 23 | -0.3 | -1.288 |
| loadedScriptCount | 1 | 1 | 0 | 0 |
| unloadedScriptCount | 0 | 0 | 0 | n/a |
| retainedDomScriptCount | 0 | 0 | 0 | n/a |
| callbackLoadCount | 1 | 1 | 0 | 0 |
| callbackConsentChangeCount | 0 | 0 | 0 | n/a |
| errorCount | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| callbackOnlyToggleMs | evaluated | yes | callbackOnlyToggleMs changed by -0.30 (-1.29%) |
| errorCount | evaluated | yes | errorCount matched expected value 0 |

Notes:
- Script lifecycle benchmark uses local fixture scripts and predicate-based completion checks.
- IAB-gated script lifecycle scenarios are intentionally excluded from v1.

## @c15t/script-lifecycle-bench :: grant-standard

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| grantStandardLifecycleMs | 23.5 | 24 | 0.5 | 2.128 |
| loadedScriptCount | 3 | 3 | 0 | 0 |
| unloadedScriptCount | 0 | 0 | 0 | n/a |
| retainedDomScriptCount | 3 | 3 | 0 | 0 |
| callbackLoadCount | 0 | 0 | 0 | n/a |
| callbackConsentChangeCount | 0 | 0 | 0 | n/a |
| errorCount | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| grantStandardLifecycleMs | evaluated | yes | grantStandardLifecycleMs changed by 0.50 (2.13%) |
| errorCount | evaluated | yes | errorCount matched expected value 0 |

Notes:
- Script lifecycle benchmark uses local fixture scripts and predicate-based completion checks.
- IAB-gated script lifecycle scenarios are intentionally excluded from v1.

## @c15t/script-lifecycle-bench :: persist-after-revoked

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| persistAfterRevokedMs | 22.5 | 22.9 | 0.4 | 1.778 |
| loadedScriptCount | 0 | 0 | 0 | n/a |
| unloadedScriptCount | 1 | 1 | 0 | 0 |
| retainedDomScriptCount | 1 | 1 | 0 | 0 |
| callbackLoadCount | 0 | 0 | 0 | n/a |
| callbackConsentChangeCount | 0 | 0 | 0 | n/a |
| errorCount | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| persistAfterRevokedMs | evaluated | yes | persistAfterRevokedMs changed by 0.40 (1.78%) |
| errorCount | evaluated | yes | errorCount matched expected value 0 |

Notes:
- Script lifecycle benchmark uses local fixture scripts and predicate-based completion checks.
- IAB-gated script lifecycle scenarios are intentionally excluded from v1.

## @c15t/script-lifecycle-bench :: reload-single

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| reloadSingleScriptMs | 21.4 | 21.1 | -0.3 | -1.402 |
| loadedScriptCount | 1 | 1 | 0 | 0 |
| unloadedScriptCount | 0 | 0 | 0 | n/a |
| retainedDomScriptCount | 1 | 1 | 0 | 0 |
| callbackLoadCount | 0 | 0 | 0 | n/a |
| callbackConsentChangeCount | 0 | 0 | 0 | n/a |
| errorCount | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| reloadSingleScriptMs | evaluated | yes | reloadSingleScriptMs changed by -0.30 (-1.40%) |
| errorCount | evaluated | yes | errorCount matched expected value 0 |

Notes:
- Script lifecycle benchmark uses local fixture scripts and predicate-based completion checks.
- IAB-gated script lifecycle scenarios are intentionally excluded from v1.

## @c15t/script-lifecycle-bench :: revoke-standard

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| revokeStandardLifecycleMs | 23 | 22.7 | -0.3 | -1.304 |
| loadedScriptCount | 0 | 0 | 0 | n/a |
| unloadedScriptCount | 3 | 3 | 0 | 0 |
| retainedDomScriptCount | 0 | 0 | 0 | n/a |
| callbackLoadCount | 0 | 0 | 0 | n/a |
| callbackConsentChangeCount | 0 | 0 | 0 | n/a |
| errorCount | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| revokeStandardLifecycleMs | evaluated | yes | revokeStandardLifecycleMs changed by -0.30 (-1.30%) |
| errorCount | evaluated | yes | errorCount matched expected value 0 |

Notes:
- Script lifecycle benchmark uses local fixture scripts and predicate-based completion checks.
- IAB-gated script lifecycle scenarios are intentionally excluded from v1.

