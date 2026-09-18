---
title: c15t mobile lane ledger
description: Internal ledger for the mobile SDK lanes - who owns what, what has landed, what is open, and the commands that gate a lane tree.
---

Internal ledger. Not published on c15t.com. Written 2026-09-18 against `v3-3`.
The clock here is unsynced, so treat dates as relative to that branch state.

Read [`tcf-mobile.md`](/docs/internal/tcf-mobile.md) for the spec and what the
cores still fail, and [`evaluator-parity.md`](/docs/internal/evaluator-parity.md)
for the measured web answer table. This file only tracks who is doing what.

## Lanes

Every lane runs in its own worktree under `/Users/kaylee/orca/workspaces/c15t/`
on a branch `KayleeWilliams/<lane>`, based on `v3-3`, and merges back into
`v3-3`. Cross-worktree links in commit messages or reports are forbidden here.

| Lane | Owns | State |
| --- | --- | --- |
| `tcf-mobile-spec` | `docs/internal/tcf-mobile.md` | Landed |
| `tcf-golden-vectors` | `native/protocol` fixtures, reference oracle | Landed |
| `tcf-kotlin-codec`, `tcf-swift-codec` | TC encoder/decoder in both cores | Landed |
| `tcf-gvl-kotlin`, `tcf-gvl-swift`, `tcf-gvl-bridge` | served vendor list in store, snapshot, bridge | Landed |
| `tcf-init-gate` | vendor list filtered to the matched policy, self-host gap | Landed |
| `tcf-iab-carrier` | Kotlin and Swift build shapes agree | Landed |
| `tcf-storage-bus` | `IABTCF_*` projection of the stored envelope | Landed |
| `tcf-drawer-ui` | `ConsentIabDrawer`, full-page | Landed |
| `tcf-web-parity` | heading rhythm and card geometry on web numbers | Landed at `aa7d22f60` |
| `tcf-enable-ab` | both cores read and evaluate an `iab` rule | in tree: `ebf6e0e8e` |
| `tcf-vendor-scope-oracle` | narrowing reference, oracle test, wiring | in tree |
| `tcf-bus-wire` | install path passes a real bus sink | open |
| `mobile-example-connect` | the example app on the native snapshot | open |
| `slop-audit`, `anti-slop-baseline` | anti-slop index and baseline | open |

## Open work, in the order it needs to happen

1. `tcf-enable-ab` lands the deny-until-explicit-choice rule for `iab`. While it
   is open the strict policy reader refuses `iab`, so no demo can present the
   disclosure; the TCF drawer is merged but never reachable under an IAB policy.
2. `tcf-bus-wire` must make the installed core carry a bus sink, or `TcStorageBus`
   stays a library with no production writer and the demo writes no standard key.
3. `mobile-example-connect` switches the example from its own `/init` fetch to the
   snapshot the bridge already carries.
4. Evaluator parity. Close the three divergences measured in
   `evaluator-parity.md`, in both native cores, then let the regenerated
   fixtures pin them. Two fixture axes are missing too: no evaluation fixture
   uses narrower than a full four-category `scope`, and no fixture pairs a
   refusal with an expired or policy-changed receipt, which is why all three
   gaps are invisible to CI today.

## Registering what a lane reports

Report from a lane tree, not from memory, in this order: base, commits, files
changed, gate results with test counts and log paths, hold, open decisions.
Gate with logs redirected and never `-q`:

```bash
sh gradlew :c15t-core:test --rerun-tasks
swift test --package-path native/core-swift --parallel
bun run --cwd packages/react-native test
bun run --cwd packages/react-native check-types
```

Swift prints `0 tests in 0 suites` under some conditions; if the count is zero
the run proves nothing, so re-run in a clean tree before claiming green.
