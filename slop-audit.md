Audit and cleanup of `origin/v3` at `7c2a028dd5978b53b669655d368e294df18a5f41`, September 9, 2026.

The worktree branch, `KayleeWilliams/slop-audit`, is based on this commit. All 13 findings from the initial audit have been addressed.

| Finding | Change |
| --- | --- |
| Manifest caches disagreed about freshness | Consolidated three implementations into [one cache runtime](packages/core/src/libs/manifest-cache-runtime.ts). Existing adapters retain their public contracts. Upstream `Age`, explicit zero lifetime, credential isolation, and cache clearing now use the same mechanics. Translation imports remain outside the lightweight cache. Added regression tests across all three entrypoints. |
| Executor wrappers copied across 46 TypeScript files | Replaced them with native Promise constructors, including equivalent JavaScript tooling copies. Removed unused wrappers. Disabled the lint rule that encouraged this boilerplate; kept the remaining promise rules. |
| React type test never reached the compiler | Moved it into a dedicated TypeScript target and added that target to `check-types`. Invalid trigger and toolbar props now fail compilation. |
| SDK tests checked construction instead of requests | Replaced them with URL, authorization, custom-header, and retry assertions. Replaced skipped integration cases with real backend-handler requests against migrated temporary SQLite storage. Removed the fixed-port HTTP fixture. |
| Duplicate Next.js and TanStack test drivers | Shared the conformance and policy-driver implementations. Both frameworks still run their own components, policy fixtures, and server request adapters. |
| Four dead CLI modules | Deleted the obsolete preflight, summary, and backend/frontend option composers. |
| Abandoned core and DevTools machinery | Deleted the unused core debug logger, subject sanitizer, and DevTools script registry. |
| Unused React style helper that passed on missing elements | Deleted the helper and its coverage exclusion, plus the unused isomorphic layout-effect module. |
| Unused underscore helpers | Removed the dead promise helpers, `_affectedRows`, `_matchPattern`, and `receiptCategories`. Corrected the outdated database strategy comment. |
| Three identical CSS generators | Moved the implementation into [shared build tooling](packages/shared/generate-distribution-css.ts). Added checks for wrapper and inline CSS output for each consuming package. |
| Repetitive theme identity tests | Kept one runtime identity assertion and added compiler checks for literal inference and invalid theme values. Wired the UI type tests into `check-types`. |
| Promise reductions used as sequential loops | Replaced them with ordered `for...of` loops in directory traversal, layout detection, rollback, and vendor issue tooling. |
| Broken Knip configuration | Replaced unsupported include directives with [a TypeScript configuration](knip.ts) that reuses package configs and supplies the missing backend entries. Removed an unsupported Vitest workspace API call that prevented config loading. |

The additional core and React pass removed five unused internal helpers, an obsolete hooks barrel, and three unused logo components. Public exports and CSS entrypoints were checked before deletion and added to Knip's entry list where needed. Knip now reports no unused files or exports in these two packages.

React's older IAB suites contained 38 misleading tests whose assertions checked only a rendered dialog or button presence. Those duplicates are removed. The purpose/vendor expansion and consent-toggle interaction tests remain. The trigger test now checks the trigger itself; missing tab and save controls fail their tests instead of skipping assertions. Core cookie tests now check serialized path and expiry options, round-trip values, and missing-cookie deletion without a constant-true assertion.

The cache behavior is documented in [the Next.js server guide](docs/frameworks/next/server-side.mdx), and bundled package docs were regenerated. A [changeset](.changeset/upset-results-grow.md) covers cache fixes and removal of the Promise.withResolvers runtime requirement.

Validation:

- Package build completed successfully.
- All package typechecks passed, including the new React and UI compiler tests.
- The full package test command passed with concurrency limited to three. Backend tests retain 26 existing skips.
- After the additional React cleanup, all 620 React browser tests passed. The final cache and cookie checks passed all 33 tests.
- Root tooling tests passed all 135 tests, including distribution CSS generation.
- Full repository lint and canonical test-ID checks passed.
- Core/React Knip checks passed. Framework config loading emits unrelated Svelte/Astro warnings.
- The changed documentation passed remark, and package docs were regenerated.
- The publish artifact guard passed for all 18 packages.

The first full test run hit a Vue dialog timeout under higher concurrency. It passed in the complete rerun with concurrency three; no timeout or assertion was weakened. This audit traced selected candidates through imports, exports, builds, and tests. It does not claim that every function or test in the repository is useful.
