# CI validation

CI groups checks by the behavior they protect. Adding another example or
benchmark should reuse an existing group unless it proves a different contract.

| Group | Owns | Does not need another copy in |
| --- | --- | --- |
| Repository and docs | Lint, format, selectors, tooling contracts, generated docs | Package runtime builds |
| Package behavior and types | Kernel/storage/policy logic, adapter components, public types, test fixture types, benchmark helper units | Every example journey |
| Database behavior | SQLite, PGlite, real Postgres/MySQL, migrations and audit contracts | Browser acceptance |
| Example acceptance | Production setup, vendor and iframe gating, revocation, navigation and outage recovery | Each benchmark timing loop |
| Next compatibility | Packed exports, Next 15/16, App/Pages, Cache Components, static export, first HTML and request/cache contracts | A second version matrix |
| Framework parity | DOM, accessibility, styles, geometry, live pixel comparisons and Storybook interactions | Example screenshot copies |
| SSR journeys | Next/Nuxt/SvelteKit headers, language, GPC, stored choices, hydration and Nuxt route contracts | Separate standalone E2E runner |
| CSS compatibility | Tailwind 3 important overrides, Tailwind 4 layers, plain CSS | Runtime performance suites |
| Consumer bundles | Initial/deferred JS, CSS, compressed sizes, import boundaries and tarballs | Per-package Rsdoctor comments |
| Runtime comparisons | Public operation costs, policy resolution, script lifecycle; full browser metrics in separate v3 runs and full validation | Routine microbench runs |
| Mobile SDK | Swift and Kotlin kernel builds and tests, both Android assemblies, the binding's autolinking as a host app resolves it, the mobile JS boundary, mobile budgets and their required-row contract | Example app builds |
| Mobile device builds (advisory) | Expo config-plugin resolution, CocoaPods resolution and the two example apps built for iOS and Android | A second native unit-test run |

## Selection and local commands

```sh
CI_DIFF_BASE=origin/canary bun scripts/ci-plan.ts
bun scripts/ci-plan.ts --full
bun scripts/ci-run.ts build
bun scripts/ci-run.ts types
bun scripts/ci-run.ts testTypes
bun scripts/ci-run.ts tests
CI_INTEGRATION=examples CI_TARGETS=react,vue bun scripts/ci-browser.ts
CI_INTEGRATION=compat CI_TARGETS=16-app,16-static-export bun scripts/ci-browser.ts
CI_INTEGRATION=parity CI_TARGETS=react,svelte,vue,astro bun scripts/ci-browser.ts
CI_INTEGRATION=journeys CI_TARGETS=nextjs,nuxt,sveltekit bun scripts/ci-browser.ts
CI_INTEGRATION=styles CI_TARGETS=all bun scripts/ci-browser.ts
```

```sh
bun run --cwd benchmarks/mobile bench:ci
bun scripts/ci-mobile-bench-report.ts --kind ios-toolchain --report-dir .ci-reports/mobile-ios-toolchain
```

The selector compares committed changes with the merge base. Without
`CI_DIFF_BASE`, it selects a full run. Its regression tests use the real
workspace dependency graph, including the docs-only paths from PR #1105.
The existing `bun run test` command additionally includes local uncommitted
changes and remains useful during development.

Docs and generated package docs do not select runtime work. Runtime changes
follow reverse dependencies, while builds include forward dependencies of all
selected hosts. Unknown paths, root config, lockfiles and removed packages
select everything. Full publishing-branch and nightly runs cover the entire
graph. Stable check `CI complete` fails if any selected job fails or cancels.
Release runs skip runtime benchmarks so publishing does not wait for timing
measurements. Tests, builds, consumer bundle budgets, and package validation
remain required. Quick runtime comparisons still gate affected PRs. Full
validation and manual CI runs still include full runtime comparisons.

Mobile work selects on paths, not on the dependency graph alone. The mobile
SDK group runs for `packages/react-native`, `native/` and `benchmarks/mobile`,
and for anything whose reverse dependencies reach `@c15t/react-native`, because
the JS boundary drives the same kernel the web packages ship.
`@c15t/benchmarking` is a dependency of both the mobile bench and the backend,
so the bench is matched by path on purpose: a workspace edge there would put a
macOS runner on every backend pull request. The device group is narrower, and
takes only the files an app compiles -- the native kernels, the binding's
`ios/` and `android/` halves, its podspec and Swift manifest, and the two
example apps -- plus the runs that select everything. Mobile Markdown,
`native/CONTRACT.md` included, selects neither group.

The device group is advisory and absent from `complete`, so `CI complete` stays
green when a pod fetch fails; read it as a build report. It is the most
expensive thing here: roughly 25 macOS minutes and 12 Ubuntu minutes per
selected run, and the same again on a dependency bump, because a full run
selects it. The mobile SDK group is required when selected and costs roughly 10
macOS plus 8 Ubuntu minutes. Both groups pin Xcode 27, the version
`native/CONTRACT.md` standardises on, export `DEVELOPER_DIR` instead of
switching `xcode-select`, cache SwiftPM, Gradle and CocoaPods, and use
GitHub-hosted runners only. Files under `native/` own no workspace, so they
still widen to a full run.

Autolinking is gated separately from the Android assemblies. Assembling an AAR proves Gradle
can compile the library; it never asks React Native's CLI whether the library can be found. A
host app's `settings.gradle` runs `react-native config`, so a package the CLI cannot resolve
fails that app before it configures a project -- and nothing in `packages/react-native` goes
through that path. `bun scripts/react-native-autolink.ts` runs the unscoped command from
`examples/react-native-bare` and checks the answer names the library module, the package class,
and the podspec. It runs on the Android leg of the mobile SDK group and, as
`scripts/react-native-autolink.test.ts`, in `bun run test:scripts`.

Mobile budgets are gated twice, each on the runner that can measure them. The
bench step runs `bench:ci`, which fails any measured row over its `budgets.json`
ceiling. `scripts/ci-mobile-bench-report.ts` then fails a required row that
produced no number, the way `BENCHMARK_EXPECTED_PACKAGES` does for the runtime
comparisons, and publishes `mobile-summary.json` and a markdown table to the
step summary and the evidence artifact. Each leg declares its own required
rows: the Swift leg takes the `swift-core` rows and the iOS slice bytes, the
Android leg takes the `kotlin-core` rows, the JS boundary and the Android class
bytes. The idle rows are reported and budget-gated but never required, and
`ios_binding_bytes` and `kotlin_bootstrap_to_snapshot_cold_ms` stay unmeasured
by design. The Kotlin bench needs a warm Gradle run first, because the harness
invokes Gradle with `--offline`, and the harness needs Xcode at
`/Applications/Xcode.app`, which the Xcode step links when the image installs a
versioned bundle. The SDK's vitest suite runs here too, on Linux, next to the
package behaviour group's copy: the mobile group owns the mobile JS contract,
and a JS-only regression should not wait on a native toolchain.

`benchmark-regression.yml` also runs full comparisons independently on pushes
to `v3`, nightly at 02:43 UTC, and manually. Scheduled runs check out `v3`;
manual runs default to `v3` and accept a different `head_ref` or `base_ref`.
Runtime comparisons use one runner per package: two jobs for quick runs and
eight for full runs. Both revisions resolve once before the matrix starts.
Each job measures base then head on the same runner and enforces that package's
complete expected results and budgets. Jobs upload separate reports and keep
running if another package fails. Failures fail the benchmark workflow and
preserve its summaries and artifacts without blocking publishing. GitHub activates schedules only once the workflow is on
the default branch; push runs work as soon as this change lands on `v3`.
Repository branch-protection settings must require `CI complete` when replacing
the old required checks.

The setup action installs the pinned toolchain and resolved Playwright
versions. Package outputs and task cache travel together in a tar artifact;
node_modules does not. Browser jobs keep failure logs and traces and report
one table per group. Newer PR commits cancel older runs.

Coverage is evidence, not a percentage target. The summary lists changed
instrumented statement-start lines and branches plus uncovered lines; full
coverage remains an artifact. Missing or empty reports fail for selected suites
that use the shared coverage configuration; non-instrumented facade/type checks
can legitimately produce no report. Add tests for missing behavior, especially
persistence, denial/revocation, server/client consistency and transport failure.
Do not add tests that merely repeat an implementation to raise a number.

The existing macOS screenshot baselines remain a local opt-in check. CI uses
live cross-framework pixel and geometry comparisons and currently passes
`--ignore-snapshots`. The historical baseline test explicitly skips before
loading stories, rather than reporting success with disabled assertions.
Vendor network probes retain their separate schedules and isolation because
local SDK mocks cannot prove a real vendor's tracking behavior.

See [benchmark commands and profiles](../benchmarks/README.md#ci-comparisons).
