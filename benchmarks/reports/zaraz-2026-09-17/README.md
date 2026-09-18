# Zaraz consent bridge verification

Tested on 17 September 2026 against v3 commit
`4382dcddb6c6a3fad15cc6503a489b6274c59ad1` on an Apple M5 Pro,
macOS arm64, Chromium 149.0.7827.55.

## Result

The bridge synchronizes c15t effective permissions with Zaraz purposes without
loading vendor SDKs. A real Cloudflare Custom HTML tool stayed blocked before
consent, executed its queued pageview after a measurement grant, and stayed
blocked after revocation. Fresh and stale-cookie visits passed, including a
visit where Zaraz was ready before c15t. See `live-results.json` for six checks.

Live testing found that setting `zaraz.consent.modal = false` when its modal is
already absent throws in the current Zaraz runtime. The bridge now checks the
current value first, with a regression test.

The Cloudflare dashboard initially displayed Automatic Pageview Tracking as
unchecked while the exported config omitted that setting. A stale-cookie visit
still executed the probe. Explicitly toggling the option on, then off, and saving
stopped this. Verify actual tool activity after configuring your own zone.

## Runtime and bundle measurements

| Scenario | Base median | Head median | Base p95 | Head p95 |
| --- | ---: | ---: | ---: | ---: |
| Empty loader | 1.6 µs | 1.6 µs | 2.2 µs | 2.2 µs |
| 50 callback-only scripts | 9.8 µs | 10.0 µs | 11.8 µs | 12.6 µs |
| Two-purpose bridge | — | 2.0 µs | — | 2.8 µs |

These are costs per kernel consent update, with loader creation and disposal
amortized across 500 updates. Each case has five warmups and 31 samples; base
and head run in alternating order in the same browser. The baseline substitutes
the changed script-loader `index.ts` and `mount.ts` files; other dependencies
are identical.

The bridge adds 1,567 minified bytes, 837 gzip bytes. The core disposal lifecycle
adds 290 gzip bytes to the isolated loader bundle, from 5,219 to 5,509. Raw samples
and build measurements are in `results.json`.

The empty-loader median is unchanged. The 50-callback median increased by
0.2 µs, about 2%; its p95 increased by 0.8 µs, about 7%. This is a
local microbenchmark using a Zaraz API fixture. It does not measure a vendor SDK,
Cloudflare edge execution, LCP, INP, or a site-level speedup. The live probe uses
Custom HTML, which still executes in the browser. A vendor-specific comparison
requires the same events and destination through both its direct SDK and a
supported Zaraz server-side tool.

The existing browser lifecycle comparison also passed all 12 budgets across
six scenarios against the same v3 base. See `lifecycle-comparison.md` for the
paired measurements. An initial run alongside Local CI failed five timing
budgets; the rerun with those checks idle passed without changing code or budgets.

## Reproduce

From the repository root, with workspace dependencies installed:

```sh
BENCH_BASE_REF=4382dcddb6c6a3fad15cc6503a489b6274c59ad1 bun benchmarks/script-lifecycle-bench/zaraz/run.ts
bun benchmarks/script-lifecycle-bench/zaraz/live-test.ts
```

The second command uses `https://zaraz-lab.c15t.cloud`, an isolated Worker custom
domain in Inth. It needs the test zone configuration below and network access.
The test intentionally writes consent cookies in a fresh Playwright browser.

- Worker: `c15t-zaraz-lab`, static assets only.
- Measurement purpose: `feGw`, assigned to tool `Ekff`.
- Tool action: `gBsx`, Pageview trigger, Custom HTML that increments
  `window.__zarazMeasurementRuns` only on `zaraz-lab.c15t.cloud`.
- Marketing purpose: `cSIK`, created but not attached to a tool. The live test
  verifies that marketing-only consent does not enable the measurement tool.
  Independent grants for two active purposes are covered by local tests.
- Consent Management enabled; built-in modal hidden; auto-injection, automatic
  pageviews and automatic SPA pageviews disabled.
- No analytics or advertising destination configured.

The deployed page uses `live-browser.ts`, bundled with esbuild as an ESM script,
and loads `/cdn-cgi/zaraz/i.js` manually. Both loading orders are supported.
The test resources remain available for review; no production hostname or
existing vendor configuration was changed.

## Next integrations

Zaraz owns tool execution and has its own consent API. Nuxt Scripts and Next
Script own browser loading and scheduling. Keep c15t as the permission source,
then add separate opt-in execution adapters for those frameworks. This change
implements the Zaraz bridge; it does not ship Nuxt or Next script adapters.

## Validation

- Core: 75 files, 1,082 tests passed.
- Scripts: 74 files, 418 tests passed, including modal, teardown and mapping regressions.
- Repository tooling: 24 files, 185 tests passed.
- CLI integration snippets: 3 tests passed.
- Core/scripts builds and type checks passed, as did core test types and the
  benchmark project's type check after building its React dependencies.
- Repository Oxlint and Oxfmt checks passed. Package docs regenerated.
- Local CI's repository job passed lint, formatting, repository tests and docs
  generation. Its Git wrapper initially returned the workspace commit ID inside
  a temporary repository created by a test. Letting that temporary repository
  use real Git fixed the local runner; no product test was disabled or changed.
- Standalone `leadtype lint --src docs` reports nine cross-framework links in
  the unchanged `docs/frameworks/index.mdx`. The repository's docs contract tests
  and remark checks pass. The standalone lint command is not fully green.

To rebuild the live fixture assets before deployment:

```sh
mkdir -p .benchmarks/current/zaraz-live/assets
bunx esbuild benchmarks/script-lifecycle-bench/zaraz/live-browser.ts --bundle --format=esm --minify --outfile=.benchmarks/current/zaraz-live/assets/bridge.js
cp benchmarks/script-lifecycle-bench/zaraz/live.html .benchmarks/current/zaraz-live/assets/index.html
```

Deploy those assets to the isolated Worker with Wrangler. For another zone,
replace the purpose IDs in `live-browser.ts`, the assertions in `live-test.ts`,
and the hostname guard in the dashboard's probe before running the live test.

## Interactive demo

The live page now includes the real `@c15t/browser` cookie banner and preference
dialog, connected to the same kernel as the Zaraz bridge. It uses a local opt-in
policy for this isolated test and persists choices under `c15t-zaraz-lab`.
Accepted and rejected choices survive reloads; the banner stays dismissed until
you reopen it. The guided demo deliberately ends with measurement denied.
There is no consent backend configured for this demo.

The page displays current c15t and Zaraz permissions, the actual tool counter,
and an activity log. Use the cookie banner to accept or reject, send a pageview,
or run the guided three-step check. The browser test also exercises the real
banner buttons, the preferences dialog and the guided check. Mobile layout is
checked at 390 pixels wide. All 12 live checks passed, including disposal during the guided demo.
Disposal stops polling, unsubscribes handlers and cancels pending demo pauses.
Results are in `live-ui-results.json`.

The interactive page bundles the browser UI as well as the bridge. Its page
bundle size is not the standalone bridge measurement reported above.

## Cleanup verification, 18 September

The cleanup centralizes mount completion, removes callback type assertions and
stops re-registering the Zaraz readiness listener after successful synchronization.
It also fixes two callback cases: consent changes interrupt later DOM batches,
and saving an identical choice inside a callback does not repeat that callback.
Tests cover interrupted mounts that remain eligible and same-ID replacements
requested during insertion.

Compared with PR commit `4682c5161fd84be690b5f3c4d1cb16d8155e21a5`:

| Scenario | Before median | After median | Before p95 | After p95 |
| --- | ---: | ---: | ---: | ---: |
| Empty loader | 1.4 µs | 1.4 µs | 2.0 µs | 2.0 µs |
| 50 callback-only scripts | 8.0 µs | 8.4 µs | 9.0 µs | 10.0 µs |
| Two-purpose bridge | — | 1.6 µs | — | 2.2 µs |

The loader's minified size fell by 27 bytes, but gzip size grew by 62 bytes to
5,571 bytes. The bridge is 843 gzip bytes. These changes improve lifecycle
correctness and code clarity; they do not establish a performance improvement.
The 50-callback median increased by 0.4 µs, about 5%. Raw samples and tested
source hashes are in `polish-results.json`.

All 40 package build/test tasks passed. The final focused run passed 1,083 core,
418 scripts and 65 DevTools tests, plus package type checks. Core test types,
repository lint and formatting also passed. The broader root test command hit a
Next.js static-export fixture that requires its dedicated compatibility runner's
backend URL; the package test run avoids invoking that fixture outside its runner.
