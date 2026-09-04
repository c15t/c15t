# Live vendor monitor

Live browser probes for every built-in `@c15t/scripts` integration, run daily
by `.github/workflows/script-vendor-monitor.yml` (issue
[#899](https://github.com/c15t/c15t/issues/899)). Unlike the jsdom contract
tests in `src/`, these probes load the **real** vendor loader scripts in real
Chromium, so they catch remote loader changes that static tests cannot — like
the Microsoft Clarity loader change that silently broke bootstrap assumptions.

## Running locally

The probes exercise the built `c15t` package, so build core first:

```sh
bun turbo run build --filter=@c15t/core
bunx playwright install --with-deps chromium
```

Then:

```sh
# All vendors
bun run --filter @c15t/scripts test:live-vendors

# One vendor
bun run --filter @c15t/scripts test:live-vendors -- --vendor microsoft-clarity

# Custom report path
bun run --filter @c15t/scripts test:live-vendors -- --report ./report.json
```

The runner exits non-zero when any probed vendor fails and always writes a
JSON report (`live-vendors-report.json` by default, gitignored).

## What a probe asserts

Each vendor runs through five phases in a fresh browser context, with one
retry before a failure is reported:

1. **consent** — with denied consent, the script must not load and no loader
   request may leave the page. `alwaysLoad` vendors (which manage consent
   internally) instead get a denied-consent **egress assertion** in an
   isolated context: the script loads, and the probe asserts zero requests to
   the vendor's collection endpoints and no vendor cookies/localStorage
   (per-vendor violation lists in `vendors.ts`; consent-safe traffic like
   Google Consent Mode pings and opt-out markers is excluded by design).
2. **bootstrap** — immediately after `loadScripts()` with granted consent,
   the manifest's queue stubs/globals must exist (before the network answers).
3. **load** — the real vendor loader must respond. `full` tier requires a
   2xx JavaScript response; `loader-only` accepts any HTTP answer, including
   Chromium ORB-filtered error pages, because placeholder ids are rejected by
   some vendors (GTM 404s, Clarity answers 204).
4. **runtime** — (`full` tier only) the real vendor runtime must initialize,
   polled for up to 10s.
5. **network** — every third-party request outside the loader allowlist is
   answered with an empty 204, so probes never send real analytics data. The
   count is reported.

Probe tiers are declared per vendor in `vendors.ts` with a comment justifying
anything below `full`. Vendors that cannot be probed at all use `skip` with a
`skipReason` so coverage gaps stay visible in the report instead of silently
disappearing.

## GitHub issue lifecycle

`manage-issues.ts` reconciles the report with GitHub after every scheduled
run: one deduped issue per failing vendor (titled
`[vendor-script-monitor] <vendor> live script contract failed`), a follow-up
comment while it keeps failing, and an automatic close once the vendor passes
again. Focused runs only touch the vendors they probed. The dedupe/planning
logic is pure and unit-tested in `report.test.ts`.

## Files

- `types.ts` — probe config, harness protocol, and report types
- `vendors.ts` — per-vendor probe configs (shared by runner and harness)
- `harness/entry.ts` — browser-side harness bundled by `Bun.build`, drives
  the production `c15t` script loader inside the probed page
- `runner.ts` — Playwright orchestration, phase assertions, JSON report
- `report.ts` — pure report/issue helpers (unit-tested)
- `manage-issues.ts` — GitHub issue sync used by the workflow

## Known limitations

- Vendors whose loaders reject placeholder ids (`loader-only` tier) get
  bootstrap + consent + endpoint-reachability coverage, but not runtime
  validation. Upgrading them to `full` needs real test account ids provided
  as repo secrets — tracked as a follow-up.
- The runner needs `--tsconfig-override live-vendors/tsconfig.json` (already
  baked into the package scripts) because Bun otherwise applies the package
  tsconfig's `c15t → dist-types` path mapping at runtime.
