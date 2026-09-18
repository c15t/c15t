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
| `tcf-app-vendor-scope` | declared vendor allowlist in both cores and the bridge | in progress |
| `init-vendor-scope-header` | `/init` honours the scope a client declares | in progress |
| `tcf-evaluator-parity` | the three evaluator divergences and their fixtures | in progress |
| `mobile-example-connect` | the example app on the native snapshot | open |
| `slop-audit`, `anti-slop-baseline` | anti-slop index and baseline | open |

## Open work, in the order it needs to happen

1. Vendor scope parity, split across the two lanes above it. The web answer is
   `options.iab.vendors`: it filters the GVL request, it narrows the list the
   runtime holds through `narrowGVLToVendors` in `packages/iab/src/tcf/fetch-gvl.ts`,
   and it clears a `gvlReference.summary` counted against the wider list. The
   mobile twin of both narrowing functions exists and is graded -- `narrowToVendorIds`
   in the Kotlin core and `narrowed(toVendorIds:)` in the Swift one -- and both are
   called from nothing but their own tests, so a device discloses whatever scope
   `resolveGvl` happened to embed. Both halves of the gap cost the same thing twice:
   disclosure wider than the publisher named, and bytes. On the byte side the
   deployment's `gvl.vendorIds` is the only scope the server knows, and an
   application that renders 32 partners has no way to say so; `gvl.ts` already
   refuses to put more than 500 ids on a request line, so a server-side scope can
   cost the surface while a request-level one, applied after the cache, costs
   nothing.
2. `mobile-example-connect` switches the example from its own `/init` fetch to the
   snapshot the bridge already carries, and declares the app's vendor scope once
   lane one lands so the drawer and the wire agree.
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
