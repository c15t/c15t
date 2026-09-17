# Mobile benchmarks

`bun run bench:mobile` measures the budgets in [`native/CONTRACT.md`](../../native/CONTRACT.md)
against the Swift core, the Kotlin core, and the JavaScript boundary of
`@c15t/react-native`, prints one table, and stores the run.

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
its justification in `budgets.json`.

A run after the first also prints a diff against the stored one. Rows that grew
by more than `subsequentRunDiffTolerancePercent` are marked `REGRESSION`. The
diff is informational; the exit code comes from the budgets.

## Budgets

All ceilings and the sampling plan live in [`budgets.json`](./budgets.json).
Nothing under `src/` carries a threshold of its own, so a budget change is a
one-file edit. A test asserts that every budget is read by at least one row, so
an orphaned ceiling cannot quietly stop being enforced.

## What is measured how

| Surface | How |
| --- | --- |
| `swift-core` | Runs `xcrun swift run -c release C15tCoreBench` in `native/core-swift` and reads its p50s. Requires Xcode, not just Command Line Tools. |
| `kotlin-core` | Runs `./gradlew :c15t-core:bench` in `native/core-android` and reads its medians. Plain JVM; no emulator needed. |
| `react-native-js` | Loads the built `dist/` of `@c15t/react-native` under Node with `react-native` replaced by [`src/support/react-native-stub.ts`](./src/support/react-native-stub.ts) and a TurboModule fake that answers with no network. |
| `bundle` | JavaScript bytes from `dist/`, iOS bytes from the linked arm64 slice of `C15tCore`, Android bytes from the compiled class bytes of the release artifacts. |

Native numbers are never patched or restated: they come from the same bench
programs a maintainer runs by hand. If a bench changes its output format, the
affected rows go `not-measured` and a parser test goes red.

## Idle

The idle rows need a quiet process, so they spawn
[`src/support/idle-subject.ts`](./src/support/idle-subject.ts) as a child, let it
settle for two seconds, then measure CPU and resident-set growth over the window.
The settle phase keeps module load and cold JIT out of the idle number.

## Not covered here

- A cold Kotlin bootstrap. The JVM bench warms the kernel before sampling, and a
  cold number needs one fresh JVM per sample.
- The iOS TurboModule binding bytes. The binding compiles against React Native
  headers, which exist only after a `pod install` in a host app.
- End-to-end runs in a simulator or on a device. These numbers are the boundary
  and the engines, on the machine running the bench.

Results are stored in `results/latest.json` so the next run can diff against them.
