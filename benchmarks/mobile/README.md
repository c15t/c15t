# Mobile benchmarks

`bun run bench:mobile` measures the budgets in [`native/CONTRACT.md`](../../native/CONTRACT.md)
against the Swift core, the Kotlin core, and the JavaScript boundary of
`@c15t/react-native`, prints one table, and stores the run.

It also answers the seven performance axes issue #1010 named. The mapping is asserted
in [`src/axes.ts`](./src/axes.ts) and
[`src/__tests__/axis-coverage.test.ts`](./src/__tests__/axis-coverage.test.ts), so an
axis that loses its last covering row fails the test suite instead of quietly
disappearing from a README.

## Running

```bash
bun run bench:mobile              # measure, print the table, store results/latest.json
bun run bench:mobile --check      # same, plus exit non-zero on a missed budget
bun run --cwd benchmarks/mobile bench:quick   # short sampling, for iterating
bun turbo run test --filter=@c15t/mobile-bench  # the vitest suite
```

`--check` is the only mode that can fail. Without it the run prints numbers and
exits zero, so an over-budget row still shows a `FAIL` verdict in the table
without breaking a report run.

## The seven axes

Every row below is produced by `bench:ci`, which CI runs on both mobile legs:
`android-js` (Ubuntu) and `ios-toolchain` (macOS with Xcode). The CI column says
whether a missing number fails the job. A row outside `MOBILE_EXPECTED_ROWS` in
[`scripts/ci-mobile-bench-report.ts`](../../scripts/ci-mobile-bench-report.ts) runs
and prints every number it can, and does not fail when it cannot.

| # | Axis | Rows that measure it | In CI |
| --- | --- | --- | --- |
| 1 | Cold-start overhead | `cold_start_js_to_first_consent_ms` (fresh process: entry evaluation plus the first handshake), `cold_start_overhead_ms` and `bootstrap_to_snapshot_cold_ms` (read path in a warm process), `native_bootstrap_to_snapshot_cold_ms`, `kotlin_bootstrap_to_snapshot_cold_ms` | JS rows: measured on both legs, required on the Android+JS leg. Swift row: iOS leg, required. Kotlin row: Android leg, budget-gated and reported, not required, because it medians over forked JVMs and reads the runner's load |
| 2 | Cached consent available | `cached_consent_available_ms` (envelope read off disk to a readable answer), `js_hydrate_envelope_ms` (decode alone), `native_hydrate_envelope_ms`, `kotlin_hydrate_envelope_ms` | JS rows: measured on both legs, required on the Android+JS leg. Native rows: their own leg, required |
| 3 | Consent UI interactive | `consent_ui_mount_to_interactive_ms`, `consent_ui_remount_to_interactive_ms`, `consent_ui_open_to_interactive_ms` | Measured on both legs, required on the Android+JS leg. Mounted under `react-test-renderer`, so this is the React half of interactivity and it is required as that |
| 4 | Consent action latency | `consent_ui_action_to_commit_ms` (tap on the rendered control to the intent reaching the module), `commit_ack_no_network_ms`, `native_commit_ack_no_network_ms`, `native_commit_ack_disk_ms`, `kotlin_commit_ack_no_network_ms` | JS and Kotlin rows: required on the Android+JS leg. Swift rows: iOS leg, required. The UI row is measured on both legs and required on the Android+JS one |
| 5 | React rerenders | `rerenders_per_consent_change`, `rerenders_per_unchanged_event` | Both legs, required |
| 6 | Idle CPU and memory | `idle_cpu_percent`, `idle_rss_growth_bytes`, `idle_heap_growth_bytes` | Runs on both legs and is budget-gated, deliberately not required: a shared runner's quiet window is not quiet |
| 7 | Bundle-size impact | `js_shipped_bytes`, `js_shipped_gzip_bytes` (this package's tarball), `js_closure_bytes`, `js_closure_gzip_bytes`, `js_closure_modules` (everything an app carries because c15t is installed), `ios_binary_bytes`, `android_binary_bytes` | JS and Android: both legs, required. iOS binary: iOS leg, required. The `js_closure_*` rows are size rows, so both legs require them: each leg builds the package, and a byte count reads the same on either machine. `ios_binding_bytes`: never measured, see below |

The run writes these mappings into its own notes, so a table printed from
`results/latest.json` says which rows of which axis went unmeasured on that machine.

### Interactivity, and what the word means here

The three UI rows mount the real `ConsentBanner` through the real provider under
`react-test-renderer`, against the TurboModule fake. "Interactive" is not a render
count: it is a host element carrying a live, non-disabled `onPress`, found by walking
the rendered tree. `consent_ui_mount_to_interactive_ms` includes the module attach and
the first render pass; `consent_ui_remount_to_interactive_ms` is a warm mount with one
client already attached, which is what a banner shown later in a session pays;
`consent_ui_open_to_interactive_ms` starts when the core says a prompt is owed, which
is the common case.

They run in their own process because `getConsentClient()` caches one client per
process, and a second cold attach inside the first process is not cold.

## Reading the table

Every row is `measured` or `not-measured`. Nothing is ever dropped.

- `measured` carries a value, a sample count, and the ceiling if the row has one.
- `not-measured` carries a reason, printed under the table. A machine without
  Xcode, or without a JDK, reports fewer numbers; it never reports a zero.
- `no-budget` means the row is measured for information and the contract sets no
  number for it.

The `Source` column separates `contract` ceilings, which quote
`native/CONTRACT.md`, from `allowance` ceilings, which this harness declares
because the contract names a behaviour without a number. Every allowance carries
its justification in `budgets.json`, including what it measured when the number
was set.

A run after the first also prints a diff against the stored one. Rows that grew
by more than `subsequentRunDiffTolerancePercent` are marked `REGRESSION`. The
diff is informational; the exit code comes from the budgets.

A span shorter than three decimals of its row's unit would print as `0`, which is
a claim that the work cost nothing, so such a value keeps four significant figures
and says so in the detail. `native_is_allowed_us` reports a real `0`: that is the
Swift bench's own resolution, not the reporter's.

## Budgets

All ceilings and the sampling plan live in [`budgets.json`](./budgets.json).
Nothing under `src/` carries a threshold of its own, so a budget change is a
one-file edit. A test asserts that every budget is read by at least one row, that
every contract ceiling has a row, and that no axis rests on an ungated row, so an
orphaned ceiling cannot quietly stop being enforced.

The axes the contract does not put a number on are gated by allowances written here
anyway, each with its reasoning: the cold JavaScript launch, the whole cached-consent
path, the three interactivity spans, the tap-to-commit span, the closure bytes, and
the heap-growth ceiling. An allowance is a promise this harness makes, not one the
contract makes, and a `Source` of `allowance` in the table says so.

## What is measured how

| Surface | How |
| --- | --- |
| `swift-core` | Runs `xcrun swift run -c release C15tCoreBench` in `native/core-swift` and reads its p50s. Requires Xcode, not just Command Line Tools. |
| `kotlin-core` | Runs `./gradlew :c15t-core:bench` in `native/core-android` and reads its medians. Plain JVM; no emulator needed. |
| `react-native-js` | Loads the built `dist/` of `@c15t/react-native` under Node with `react-native` replaced by [`src/support/react-native-stub.ts`](./src/support/react-native-stub.ts) and a TurboModule fake that answers with no network. |
| `bundle` | JavaScript bytes from `dist/`, iOS bytes from the linked arm64 slice of `C15tCore`, Android bytes from the compiled class bytes of the release artifacts. |

A few rows are measured a different way from the warm loops above, because a warm loop
would measure the wrong thing:

- **Cold start** spawns [`src/support/cold-start-subject.ts`](./src/support/cold-start-subject.ts)
  as a fresh `node --import tsx` process per sample. One process is one sample: a
  second launch inside the first process is warm, which is exactly what the row
  excludes. The host cost of the harness itself is timed separately and excluded.
- **Interactivity** spawns [`src/support/ui-interactive-subject.ts`](./src/support/ui-interactive-subject.ts)
  for the same reason: a client cache that survives a mount makes the second mount
  look like the first.
- **Cached consent** does not spawn. It writes the fixture envelope to a real file and
  makes the fake module answer a read from that file, then asserts the stored marketing
  grant survived. A boundary that fell back to its deny-all snapshot would read `false`
  there, so the row fails instead of reporting a fast number about the wrong payload.

The closure rows walk the built entry's real import graph, subpath exports included,
so `js_closure_bytes` counts what a bundler would include and not just what this
package's tarball ships. Third-party packages the walk reaches (`valibot`, `base-x`,
`react`) are named in the row detail and not counted, because an app carries them
anyway.

Native numbers are never patched or restated: they come from the same bench
programs a maintainer runs by hand. If a bench changes its output format, the
affected rows go `not-measured` and a parser test goes red.

## Idle

The idle rows need a quiet process, so they spawn
[`src/support/idle-subject.ts`](./src/support/idle-subject.ts) as a child, let it
settle for two seconds, then measure CPU and resident-set growth over the window.
The settle phase keeps module load and cold JIT out of the idle number.

## Not measured, and what it would take

These are gaps in the harness, not rows that went quiet. None of them can be closed
from inside `benchmarks/mobile`.

- **An app launch on a simulator or a device.** Nothing in CI starts an app: the
  browser/device job builds the example and never launches it. Closing this needs a
  job that installs and cold-starts the example app, on a device profile, and reads
  the time from process start to the first consent answer. Until then no number here
  certifies the contract's 10 ms cold-start figure, which is a device-profile promise;
  the JavaScript row beside it is a module-loader number on a dev machine.
- **The Metro bundle delta.** Same missing job. It would need one Metro build of the
  example with c15t and one without, and the closure bytes are a stand-in for nothing
  more than the module graph, not for what Metro and Hermes actually keep.
- **`ios_binding_bytes`.** The TurboModule binding compiles against React Native
  headers, which exist only after a `pod install` in a host app. It needs a CocoaPods
  step in a job that already has Xcode.
- **Idle cost of the native core on a device.** The idle rows read the JavaScript
  process on the machine running the bench. On-device CPU and memory need the same
  device job as the launch numbers.
- **Consent UI under a platform renderer.** `react-test-renderer` runs no layout pass,
  no platform `Modal`, and no font loading, so the interactivity rows are the React
  half of the span and not the frame the user sees.

Results are stored in `results/latest.json` so the next run can diff against them.
