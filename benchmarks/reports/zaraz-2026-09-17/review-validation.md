# Adversarial review validation

Reviewed baseline: `119c1f61da23bf33fc6bd11035f1a1eaab6d8e57`.

## Findings checked

| Finding | Validation | Resolution |
| --- | --- | --- |
| Same-ID rerenders remount vendors | Reproduced. Fresh callbacks caused DOM replacement and repeated initialization. | Reuse an unchanged resource unless the configuration opts into object-owned cleanup through `onDispose`. Changed resources and explicit cleanup owners still start a new lifecycle. |
| Self-removing inline scripts run again | Reproduced with inline JavaScript executing in jsdom, both direct and fragment insertion. Chromium provider tests also cover this case. | Track whether insertion occurred, rather than inferring execution from DOM attachment. |
| Revoked retained scripts prevent replacement | Reproduced for replacement and removal. | Preserve element ownership through revocation and clean up owned retained elements on teardown. Borrowed elements stay untouched. |
| Independent Zaraz triggers can precede synchronization | Existing documented setup limitation, not a new guarantee supplied by the bridge. | Make DOM-ready, timer and click trigger risks explicit in the guide. |
| API failures prevent readiness without a dedicated error callback | Reproduced for `getAll`, `set` and delayed readiness. | Add optional `onError`; verify a later consent update or readiness event recovers. Document that automatic timed retries are not performed and failed revocation can leave a stale grant. |
| Every returning visitor gets denied then granted | Not reproduced when the kernel already has the visitor choice. | Add a regression asserting no cookie rewrite or replay in this case. Document the expected updates when saved state arrives after the bridge starts. |
| Consent-changing callbacks can loop indefinitely | Reproduced with a bounded 1,000-call callback so the regression cannot hang CI. | Stop after 100 consecutive reconciliation passes, dispose the loader and emit a debug error. |

The initial five regressions for the first three findings failed against the
reviewed baseline and pass with the fixes. The feedback-loop and API-error
regressions also failed before their fixes. Tests check observable execution,
DOM ownership, consent callbacks and recovery.

## Validation

- All 58 package build, test and type-check tasks passed.
- The final focused run passed 1,091 core, 422 scripts and 65 DevTools tests.
- The React provider browser file passed all 23 tests, including both new rerender cases.
- Repository tooling passed 185 tests. Core test types, repository lint, formatting and documentation generation passed.
- The refreshed Inth demo passed all 12 live checks with no browser errors. `review-live-results.json` records the source commit and deployment version.
- Local CI consumer bundle analysis passed all 30 budgets across 23 expected results, comparing `b35f87427` with its parent `119c1f61d`. The runner needed real Git history because its synthetic checkout had no parent commit. No benchmark budgets or checks changed.

Local CI also passed the repository job, including lint, formatting, all 185
repository tests and package documentation generation. Its Git wrapper broke a
test-created temporary repository; restoring real Git in that runner made the
unchanged test pass. Its build job also passed all 20 package builds. The wider workflow could not
finish: Local CI selected the `ci-plan` artifact when setup requested `ci-build`,
then failed to extract the missing `ci-build.tar`. The browser checks never ran
in that workflow attempt, and the run was stopped after the same setup failure
in its bundle job. Package and Chromium results above come from the separate
host runs, not this Local CI attempt. The standalone consumer bundle job passed
as reported above.

## Microbenchmark

The same local browser benchmark compares these changes with the reviewed PR
head. Empty-loader median was 1.6 microseconds before and after. The 50-callback
median changed from 9.6 to 9.4 microseconds, with p95 changing from 11 to 12.
This does not establish a performance improvement. The bridge measured
1.8 microseconds per update.

The loader grew from 5,571 to 5,838 gzip bytes, and the bridge from 843 to 878.
The loader is 619 gzip bytes above the original v3 base. Samples, methodology
and source hashes are in `review-results.json`.

## Browser lifecycle comparison

Against the original v3 base, the usual base-first run passed 11 of 12 budgets.
The standard grant scenario missed by 9.7 ms, or 37.02%. A repeat with unchanged
code and budgets passed 9 of 12 budgets, missing grant, revocation and callback
switching. Functional invariants passed in both runs.

A diagnostic run changed only measurement order, measuring head before base.
It passed all 12 budgets. Grant medians were 24.6 ms for base and 24.8 ms for
head; revocation was 24.6 ms and 23.7 ms. These end-to-end measurements include
hosted consent saves, local HTTP requests and browser scheduling. The observed
order sensitivity prevents an unqualified performance-pass or speedup claim.

All three reports are retained as `review-lifecycle-first.md`,
`review-lifecycle-repeat.md` and `review-lifecycle-reverse.md`. The first two
identify the pre-commit HEAD, but measured the working-tree product source
whose hashes are in `review-results.json`. The final diagnostic identifies
commit `b35f87427c419528f6eee55eaecfc5f2fcc3b3d1` with the same product source.
To repeat the diagnostic, run the two `measure` calls in
`scripts/benchmark-run.ts` in head-then-base order; keep all other settings
unchanged. No benchmark budgets or repository benchmark scripts were changed.
