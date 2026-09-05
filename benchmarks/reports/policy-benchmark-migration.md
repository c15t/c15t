# Policy benchmark migration preparation

Preparation is complete. Final performance acceptance is outstanding and the smoke measurements include failures against enforced budgets. Nothing in this report is a full comparison or a release approval.

## Source and ownership

The benchmark migration is commit `5d09d2146e5c0c8ffde27ccef24c0aab8860cd80`. The follow-up commit containing this report extracts policy operation measurement from the fixture runner to satisfy the existing complexity rule, without changing the measured work.

Only `benchmarks/**`, `apps/bundle-bench-react/src/fixtures.ts`, and task scripts under `/tmp/c15t-1025-coordination` were edited for this preparation. No source packages or remote state were changed. Peer source commits already imported into this child are separate from the benchmark changes:

- `121e7feaf`: kernel policy and callback bridge removal.
- `066537df8`, `1698cb1ed`: canonical schema producer and frozen receipt metadata.
- `5a58927ad`: core records and policy transport contract.
- `637e4f461`: canonical backend decisions.
- `8c4d872ff`: adapter and fixture migration.

The original baseline remains `bbfcc04bb7ace3bff537cbddb2354498a437121c`. The verified historical v2 artifacts remain `/tmp/c15t-1025-coordination/performance/v2-verified/core-runtime`, with SHA `de8dbdf86806b340def045ce5cc2ff96a7459841`. This validation did not overwrite either baseline or its evidence.

## What changed

Benchmark apps use canonical permissions, explicit choices, callbacks, manifest producers and init mapping. SSR scenarios receive the resolved server payload and observe actual browser requests and restored choices. Ordinary React entry analysis counts imported modules as well as emitted bytes, including eliminated zero-byte modules.

Historical empty-kernel core metrics and their v2 improvement budgets remain. Their metadata explicitly records that fixture sizes do not change the workload. Construction cleanup occurs after timing so disposed kernels do not accumulate across samples. These metrics cannot demonstrate full policy-path speedups.

Policy runtime adds six asserted operations: accept, reject, partial receipt, repeated denial hydration, notice dismissal, and standing GPC after signal removal. Each includes setup and behavioral assertions. The repeated denial operation uses kernel record hydration; the browser repeat scenario separately measures actual persistence reads into fresh kernels. There is no equivalent historical empty-kernel operation, so no v2 gain is claimed for these additions.

Cookie metrics count the full c15t request-cookie header, including names and separators. The notice scenario saves a partial choice while notice remains required, detects GPC, and explicitly dismisses the notice. Measured values are choice 127 B, notice 86 B, privacy 29 B, and aggregate 276 B. The aggregate ceiling remains 320 B. The approved compact notice projection replaces the former zero-byte assumption with 128 B; privacy has a 64 B allowance based on the measured two-category 29 B projection. Notice localStorage measured 122 B against its unchanged 256 B ceiling.

`benchmarks/shared/scripts/capture.sh` and `/tmp/c15t-1025-coordination/perf-capture.sh` attempt all eight capture commands and exit nonzero if any fails. Tests cover successful and failing suite commands and refuse output-directory reuse. No expected-suite waiver or budget weakening was added.

`perf-sync-harness-to-base.sh` prepares benchmark-only historical API adaptations for the original checkout and checks its exact SHA. It preserves the existing CSS fixtures whose offline API differs. Its translations are confined to the historical checkout. Review and validate that adaptation before the final recapture; the final browser builds have not been proven against that historical adaptation in this follow-up.

## Validation and measured failures

Fresh validation logs live under `/tmp/c15t-1025-coordination/migration-validation-*`:

- `bun run bench:test`: 27 tests pass in six files, including gate rejection, capture exit propagation, cleanup timing, actual receipts, and real persistence projections.
- Oxlint and Oxfmt checks pass for `benchmarks` and `apps/bundle-bench-react`.
- Script lifecycle TypeScript check passes, resolving the stale earlier log that referenced removed `initialHasConsented`.
- Policy smoke completes all three fixtures at 25 samples and five warmups. Artifacts are `benchmark-migration-smoke/policy-validation`; they record SHA `5d09d2146` and benchmark-only dirt for the extraction.

Existing preparation build logs show ten successful package build tasks and successful React, Next.js, bundle, lifecycle, Nuxt and Svelte benchmark builds. Existing smoke outputs cover five core fixtures, three policy fixtures, eleven React scenarios, eight Next.js scenarios, seven Nuxt scenarios, six lifecycle scenarios and five bundle entries. These are limited smoke outputs, not all required final route/tarball results. Their source SHA is `8c4d872ff` with the then-uncommitted benchmark migration recorded as dirty.

Concrete observations from those artifacts:

- Ordinary React has zero IAB, devtools and all-locale input bytes and module counts.
- Refreshed `nextjs-final/ssr` and `ssr-repeat` each observe zero browser init requests, console errors and hydration warnings. Repeat reports one restored choice.
- Refreshed React repeat observes 15 hydrate calls, 15 successes, no hydration writes and no console or hydration warnings. Hydration median is 66.667 microseconds at three iterations per batch and five batches.
- React policy prompt readiness still records three probe commits, exceeding the unchanged two-commit budget. Repeat records three against its three-commit ceiling. This remains a runtime/adapter investigation, not an accepted exception.
- Fresh policy smoke medians are about 1,208–1,393 microseconds for accept/reject/partial/repeat, 28,609–34,351 microseconds for notice and 32,945–39,673 microseconds for standing GPC. All exceed the declared 150-microsecond compound-operation allowance. The operations include policy setup and assertions. The coordinator received an escalation; thresholds remain intact.

The earlier Nuxt type-check log only records that the package has no `check-types` script. A successful Nuxt build is not a substitute claim that this missing script passed.

## Remaining work

The coordinator must integrate the benchmark commits, resolve the observed performance/render failures with the source owner, finish functional checks, and schedule a quiet window on the final integrated source. Rebuild and capture head and original base back to back using full counts and the reviewed historical adapter. Supply the verified v2 arm, retain every expected suite and budget, and run with `BENCHMARK_ENFORCE=true`.

Final acceptance must quote the actual `summary.json` result and budget counts, exact source SHAs, runtime versions and benchmark dirt. No final summary counts or enforced pass are claimed here. Final artifact/publish checks also remain with that integration run.
