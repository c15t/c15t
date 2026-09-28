# Issue #1010 coverage audit

A record of one run, not a living document. The axis-to-row mapping lives in
[`src/axes.ts`](./src/axes.ts) and [`README.md`](./README.md); the numbers below are
what `bun run --cwd benchmarks/mobile bench` produced on 2026-09-17 at `e14ef5790`, on
darwin/arm64, in a worktree that also carried uncommitted changes to
`packages/react-native` and `native/`. Copy them into the docs only after re-running on
the branch that will ship.

Budget = the ceiling in [`budgets.json`](./budgets.json). `contract` quotes
`native/CONTRACT.md`; `allowance` is this harness's own promise.

## 1. Cold-start overhead

| Row | Measured | Budget | Source |
| --- | --- | --- | --- |
| `cold_start_js_to_first_consent_ms` | 31.621 ms | 80 ms | allowance |
| `cold_start_overhead_ms` | 0.101 ms | 10 ms | contract |
| `bootstrap_to_snapshot_cold_ms` | 0.101 ms | 15 ms | contract |
| `native_bootstrap_to_snapshot_cold_ms` | 0.570 ms | 15 ms | contract |
| `kotlin_bootstrap_to_snapshot_cold_ms` | not measured | 15 ms | contract |

The 31.6 ms span is a fresh Node process loading the built entry and taking its first
read: 31.4 ms of module evaluation, 0.2 ms of handshake, with 7.955 ms of React and
harness work timed separately and excluded. Of the 131 modules it evaluates, 46 belong
to `@c15t/react-native` and 85 to `@c15t/core`, `@c15t/schema`, and
`@c15t/translations`, reached through the built barrel. That is 3.2x the contract's
10 ms, and it is not the number the contract means: the contract's is a device figure,
and a bundled app does not resolve 131 specifiers at boot. The contract number stays
uncertified until something launches the app.

## 2. Time until cached consent is available

| Row | Measured | Budget | Source |
| --- | --- | --- | --- |
| `cached_consent_available_ms` | 0.025 ms | 3 ms | allowance |
| `js_hydrate_envelope_ms` | 0.008 ms | 3 ms | contract |
| `native_hydrate_envelope_ms` | 0.538 ms | 3 ms | contract |
| `kotlin_hydrate_envelope_ms` | 0.052 ms | 3 ms | contract |

The JavaScript row reads a 3,117 B envelope off a real file and asserts the stored
marketing grant survives, so it cannot pass by falling back to deny-all.

## 3. Time until consent UI is interactive

| Row | Measured | Budget | Source |
| --- | --- | --- | --- |
| `consent_ui_mount_to_interactive_ms` | 5.013 ms | 25 ms | allowance |
| `consent_ui_remount_to_interactive_ms` | 0.371 ms | 5 ms | allowance |
| `consent_ui_open_to_interactive_ms` | 1.207 ms | 10 ms | allowance |

Interactive means a rendered control carrying a live, non-disabled `onPress`, in the
real `ConsentBanner` under the real provider. Three controls render while a choice is
owed, zero after accept, and a test pins both counts so a quiet tree fails instead of
printing a fast number.

## 4. Consent action latency

| Row | Measured | Budget | Source |
| --- | --- | --- | --- |
| `consent_ui_action_to_commit_ms` | 0.800 ms | 10 ms | allowance |
| `commit_ack_no_network_ms` | 0.004 ms | 50 ms | contract |
| `native_commit_ack_no_network_ms` | 0.174 ms | 50 ms | contract |
| `native_commit_ack_disk_ms` | 0.0002 ms | 50 ms | contract |
| `kotlin_commit_ack_no_network_ms` | 0.139 ms | 50 ms | contract |

The disk row reads 0.0002 ms (0.2 us) where the previous stored run read 1.445 ms. The
harness reports what the Swift bench prints; a file-backed acknowledge that fast means
the write no longer sits inside the measured span. That belongs to whoever changed the
Swift store, not to this harness, and it is worth a look before the number goes in docs.

## 5. React rerenders

| Row | Measured | Budget | Source |
| --- | --- | --- | --- |
| `rerenders_per_consent_change` | 1 | 1 | contract |
| `rerenders_per_unchanged_event` | 0 | 0 | contract |

Four subscribed components, one change that moves `marketing` alone, one event that moves
no selected slice.

## 6. Idle CPU and memory

| Row | Measured | Budget | Source |
| --- | --- | --- | --- |
| `idle_cpu_percent` | 0.002 % | 2 % | allowance |
| `idle_rss_growth_bytes` | 0 B | 262,144 B | allowance |
| `idle_heap_growth_bytes` | 6,088 B | 262,144 B | allowance |

30 s window, one live subscription, two seconds of settle first. Budget-gated in CI but
deliberately not on the required-row list: a shared runner's quiet window is not quiet.

## 7. Bundle-size impact

| Row | Measured | Budget | Source |
| --- | --- | --- | --- |
| `js_shipped_bytes` | 98,546 B | 98,304 B | allowance |
| `js_shipped_gzip_bytes` | 20,862 B | 24,576 B | allowance |
| `js_closure_bytes` | 389,639 B | 524,288 B | allowance |
| `js_closure_gzip_bytes` | 90,701 B | 131,072 B | allowance |
| `js_closure_modules` | 131 | none | - |
| `ios_binary_bytes` | 469,545 B | 1,048,576 B | allowance |
| `android_binary_bytes` | 824,096 B | 1,048,576 B | allowance |
| `ios_binding_bytes` | not measured | 262,144 B | allowance |

`js_shipped_bytes` is 242 B over its ceiling at this commit, from the uncommitted
`packages/react-native` changes in this worktree. The ceiling was not raised to hide it.

The shipped-vs-closure gap was the finding worth documenting: the package shipped
98.5 KB while an app carried 389.6 KB raw / 90.7 KB gzipped across 131 modules, because
the built barrel re-exported the `@c15t/core` graph. `js_shipped_bytes` alone
understated the install by about 4x. The next section records what closed it, and what
the ceilings became.

## Not measurable here

The reasons and what each would take are in [README.md](./README.md#not-measured-and-what-it-would-take):
an app launch on a simulator or device, the Metro bundle delta, the iOS TurboModule
binding slice, a cold Kotlin bootstrap, idle cost of the native core on a device, and
the consent UI under a platform renderer.

## Other numbers from the same run

`policy_apply_per_rule_set_us` 12.083 us against 100 us, 8 rule sets.
`snapshot_read_us` 0.041 us, `is_allowed_us` 0.042 us, one snapshot object across
300 reads. `native_is_allowed_us` reports a real 0: that is the Swift bench's own
resolution, not the reporter rounding a value away.

Run totals: 45 measured, 2 not-measured, 1 over budget.

## Post-audit: the barrel edge is gone

That 4x had one cause. `@c15t/react-native` needs two string arrays from `@c15t/core`
at runtime, `CONSENT_CATEGORIES` and `OPTIONAL_CONSENT_CATEGORIES`, and imported them
from the barrel. Every other type it takes from core is a type import, which a bundler
erases, and a bundler cannot tell the two apart at the barrel, so the kernel, the
schema, and the translations arrived with the arrays.

`@c15t/core/consent-categories` now exports those arrays from a module with no imports
of its own, and both call sites read it. Re-measured on the same machine:

| Row | Before | After | Ceiling |
| --- | --- | --- | --- |
| `js_closure_bytes` | 389,639 B | 74,507 B | 131,072 B |
| `js_closure_gzip_bytes` | 90,701 B | 14,956 B | 24,576 B |
| `js_closure_modules` | 131 | 48 | 80 |
| `cold_start_js_to_first_consent_ms` | 31.621 ms | 10.9-12.1 ms | 40 ms |

Three things follow from that table.

The closure is now smaller than the tarball. 24,220 B of what `@c15t/react-native`
ships is the Expo config plugin, which runs in Node at build time and never reaches a
device, so `js_shipped_bytes` went from an understatement to the pessimistic row.

Every ceiling above sits well above its measurement on purpose, and none of them is the
real gate. [`src/__tests__/module-closure.test.ts`](./src/__tests__/module-closure.test.ts)
names the exact `@c15t/core` files an app may carry, so a runtime import to the barrel
fails a test on the pull request that adds it instead of showing up as a budget somebody
has to notice. Reintroducing the import was verified to fail two cases and pull 54 extra
files back in.

`js_closure_modules` gained a budget in the same change. A module count is the size gate
minification cannot hide, and it is the row that caught this first: it said 131 while the
byte rows still looked comfortable.
