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
| `tcf-enable-ab` | both cores read and evaluate an `iab` rule | Landed at `94590e0da` |
| `tcf-vendor-scope-oracle` | narrowing reference, oracle test, wiring | Landed at `7be6ce1a7` |
| `tcf-bus-wire` | install path passes a real bus sink | Landed at `7b322e45a`, recovered by the manager: the lane never committed, so its Android/iOS sink hunks were re-applied on the current base by hand and the vendored kernel copy regenerated with `scripts/sync-vendored-core.ts`. Do not merge that tree; it is stale and its doc half regresses the `iab` contract. |
| `tcf-app-vendor-scope` | declared vendor allowlist in both cores and the bridge | Landed at `31a6305c2`, merged into `v3-3` as `b59302638` |
| `init-vendor-scope-header` | `/init` honours the scope a client declares | Landed at `aca02651e`, merged into `v3-3` as `edd5f3935` |
| `tcf-evaluator-parity` | the three evaluator divergences and their fixtures | in progress |
| `mobile-example-connect` | the example app on the native snapshot, and the scope it declares | in progress |
| `slop-audit`, `anti-slop-baseline` | anti-slop index and baseline | open |

## Open work, in the order it needs to happen

1. Vendor scope parity is closed on both sides of the wire. Web puts
   `options.iab.vendors` to three uses; the native cores now carry the first two, and
   the third has nothing to act on. `NativeConfig.vendors` and `CoreConfig.vendors`
   prune the list where it enters kernel state, on both paths it arrives by -- the
   `gvl` that `/init` embeds and the bytes read back out of storage -- through
   `narrowToVendorIds` in the Kotlin core and `narrowed(toVendorIds:)` in the Swift
   one, and the same declaration leaves the device as `x-c15t-vendors`, which `/init`
   intersects with the deployment's `gvl.vendorIds` before it embeds a document. An
   app's declaration can therefore only ever narrow: what it names is what it holds,
   what it holds is what the drawer renders, and a served list wider than the
   declaration costs it nothing it displays. The upstream fetch stays scoped by the
   deployment's own `gvl.vendorIds`, which is what keeps a 32-partner publisher off the
   full document without letting a request line pick a cache key. The one web use with
   no native twin is the `gvlReference.summary` clear, because a device writes no TC
   String while no CMP identity is registered -- see `tcf-mobile.md`.
2. `mobile-example-connect` declares the example's scope through the Expo plugin's
   `vendors` parameter and the device journey reports the partner rows the drawer
   renders against the vendors the served list carries, so the drawer and the wire are
   graded against one number rather than two someone typed.
3. Evaluator parity, now the `tcf-evaluator-parity` lane. Close the three
   divergences measured in `evaluator-parity.md`, in both native cores, then let
   the regenerated fixtures pin them. Two fixture axes are missing: no evaluation
   fixture uses narrower than a full four-category `scope`, and no fixture pairs a
   refusal with an expired or policy-changed receipt, which is why all three gaps
   are invisible to CI today.

## Registering what a lane reports

Report from a lane tree, not from memory, in this order: base, commits, files
changed, gate results with test counts and log paths, hold, open decisions.
Gate with logs redirected and never `-q`:

```bash
sh gradlew :c15t-core:test --rerun-tasks
swift test --package-path native/core-swift
bun run --cwd packages/react-native test
bun run --cwd packages/react-native check-types
```

Use `swift test` without `--parallel` when the evidence is a log. Under
`--parallel` SwiftPM prints only
`Test run with 0 tests in 0 suites passed` and no per-test tally, so a log of
that run proves nothing either way even though the tests did run. The plain
runner prints `Executed 164 tests, with 0 failures`, which is what a report has
to quote.
