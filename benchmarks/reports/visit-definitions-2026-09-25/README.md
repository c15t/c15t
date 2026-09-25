# Benchmark visit definitions, 2026-09-25

Several browser-bench labels described something other than what the harness
measured. This report records each defect, the fix, and old-versus-new
harness output for the same c15t build. It supersedes parts of
[gate-2026-07-05](../gate-2026-07-05.md).

## Conditions

- c15t packages built from `v3` at `40032552c` (3.0.0-alpha.2). "Before" is
  the harness on that commit; "after" is this change. Both ran against the
  same build on the same machine.
- Condition A: no CPU or network throttle, no injected latency. Condition B:
  4× CPU, 170 ms latency, 1,125,000 B/s down, 187,500 B/s up, and 200 ms added
  to the consent origin's `/init` and `/manifest`.
- 7 measured samples after 1 warm-up unless a row says otherwise. Medians,
  with the range in parentheses.
- Apple silicon laptop, headless Chromium, localhost servers. Other benchmark
  jobs were running. Load averages were 5–18 during these runs. Treat
  timing differences under about 10 ms as noise. The label and assertion
  findings don't depend on timing.

## 1. `repeat-visitor` measured a first-time visitor

The React, Next.js and TanStack Start harnesses opened a new browser context
for `repeat-visitor` without copying the cookies or localStorage from the
visit that accepted. The SvelteKit and Astro harnesses did seed a stored
choice, but stamped it `i.t:1800000000000` (January 2027). The cookie reader
rejects a consent time in the future, so those visitors had no stored choice
either. Only the Nuxt harness, which already used `createRepeatVisitorCookie()`
and asserted the result, measured a returning visitor.

The harnesses now run `saved-consent-accept` and `saved-consent-reject`. A
fresh visit clicks accept or reject, and its `storageState()` (cookies and
localStorage) seeds a new context that loads the page again. Every sample
must show no banner in the DOM or the server HTML and must restore the stored
choice, or the run fails. Fresh visits must show the banner. SvelteKit and
Astro keep the `repeat-visitor` name with a correctly dated cookie and the
same assertion.

| Harness | Before: arm | Banner shown | Banner ready | After: arm | Banner shown | Choice restored | Browser `/init` |
| --- | --- | ---: | ---: | --- | ---: | ---: | ---: |
| React | `repeat-visitor` | 7/7 | 50.9 (50.2–57.8) ms | `saved-consent-accept` | 0/7 | 7/7 | – |
| React | | | | `saved-consent-reject` | 0/7 | 7/7 | – |
| Next.js | `repeat-visitor` | 7/7 | 57.3 (53.3–66.0) ms | `saved-consent-accept` | 0/7 | 7/7 | 0 |
| Next.js | | | | `saved-consent-reject` | 0/7 | 7/7 | 0 |
| TanStack Start | `repeat-visitor` | 7/7 | 58.6 (57.0–69.7) ms | `saved-consent-accept` | 0/7 | 7/7 | 0 |
| TanStack Start | | | | `saved-consent-reject` | 0/7 | 7/7 | 0 |
| SvelteKit | `repeat-visitor` | 7/7 in server HTML | 38.0 (32.5–45.2) ms | `repeat-visitor` | 0/7 | 7/7 | 0 |
| Astro | `repeat-visitor` | 7/7 in server HTML | 26.6 (23.2–29.5) ms | `repeat-visitor` | 0/7 | 7/7 | 0 |

The old arms reported a banner-ready time, which a returning visitor cannot
have. The Next.js arm also made one browser `/init` request per visit, as a
first-time client visitor does. The new arms report `null` for banner times
rather than `0`. The shared assertion `assertVisitBannerState` catches the old
flow. Replaying it against the Next.js bench fails with:

```text
old repeat-visitor (new context, no storage): a saved-accept visit carried a
stored choice but still showed the consent banner (dom=1, activeUI=banner,
serverHtml=n/a). The stored consent was not carried over.
```

The Next.js `ssr-repeat` arm was already a real returning visitor. It reloads
in the context that accepted, so its browser cache is warm, and its label now
says so. It reported `bannerReadyMs = 0` for a visit with no banner; that is
now `null`.

## 2. `bannerInFirstHtml` read the whole response

Every harness took `(await page.goto(path)).text()`, the finished document,
and called the result `bannerInFirstHtml`. The harnesses now read the raw
HTTP body with `accept-encoding: identity`, record each chunk as the socket
delivers it, and report two metrics: `bannerInFirstChunk` and
`bannerInServerHtml`. They also report when the first chunk and the banner
markup arrived.

| Route | Condition | First chunk | Anywhere in server HTML | First chunk at | Banner markup at |
| --- | --- | ---: | ---: | ---: | ---: |
| Next.js bench `manifest-ssr` | A | 1 | 1 | – | – |
| Astro bench `ssr-manifest` | A | 0 | 1 | 2.0 ms | 2.0 ms |
| Production consumer `/`, fresh | A | 0 | 1 | 4.8 ms | 7.7 ms |
| Production consumer `/`, fresh | B | 0 | 1 | 2.9 ms | 4.6 ms |
| Production consumer `/`, cold SDK manifest | B | 0 | 1 | 2.9 ms | 209.5 ms |
| Production consumer `/`, saved consent | A and B | 0 | 0 | – | – |

The Next.js and TanStack bench layouts await consent before React streams
anything, so the banner arrives in the first chunk there. The production
consumer puts the page inside `<Suspense fallback={null}>` while it awaits
consent, as the site that exposed the alpha.2 regressions does. Its shell
streams first and the banner follows in a later chunk. The old metric
reported `1` for both layouts.

## 3. Banner milestones and page paint are separate metrics

The shared observer now records, per visit:

- `bannerDomMs`: the banner root first exists in the DOM.
- `bannerFirstFrameMs`: the first animation frame after that. It is the
  earliest frame that could paint the banner, not a paint timestamp.
- `bannerPaintMs`: Element Timing paint of banner text, when Chromium emits it.
  It no longer falls back to the app probe's reading.
- `bannerReadyMs`: hydrated readiness from the app probe.
- `fcpMs` and `lcpMs` for the page.

Production consumer `/`, fresh visit, condition B: banner in the DOM at
408.2 ms, painted at 456 ms (FCP and LCP also 456 ms), hydrated and ready at
900.5 ms. The server-rendered banner is visible about 440 ms before it can
respond. The old harnesses reported only the last of these.

## 4. Cold states are separate scenarios

Each result now carries `cacheBrowser`, `cacheSdkManifest`,
`cacheFrameworkProcess`, `cacheCdnEdge` (always `not-measured`) and a
`cacheSetup` sentence. The `--cold-manifest` samples in the Next.js, TanStack
and Nuxt harnesses are labelled as the first visit to a route after the
server started with a new manifest token. That sample also includes loading
the route module, and an earlier scenario in the same process may already
have fetched the manifest through another route.

The Nuxt harness only read the cold token at build time, so `--cold-manifest`
did not change the manifest URL of an existing build. It now passes the URL
at runtime.

The production consumer measures each state on its own (condition A, `/`).
FCP in this consumer is bimodal, so the table gives the share of slow samples
and the median of each mode instead of one median:

| Scenario | Browser cache | SDK manifest cache | Process | TTFB | FCP over 200 ms | FCP fast / slow | Origin `/manifest` fetches |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| `fresh` | cold | warm | warm | 4.7 ms | 3/7 | 36 / 336 ms | 0 |
| `fresh-warm-browser-cache` | warm | warm | warm | 4.2 ms | 2/7 | 40 / 356 ms | 0 |
| `fresh-cold-sdk-manifest` | cold | cold | warm | 5.3 ms | 3/7 | 36 / 348 ms | 1 |
| `fresh-cold-process` | cold | cold | cold | 42.0 ms | 7/7 | – / 404 ms | 0 |

A restarted `next start` process made no origin manifest fetch. The route
handler's Next Data Cache entry lives on disk and survives the restart, so a
process restart is not a cold manifest. The two FCP modes, about 35 ms and
about 345 ms, appear in every warm-process state, including saved-consent
visits. They don't follow any cache. The page renders inside a Suspense
boundary, so the reveal of streamed content is the first thing to check; that
belongs with the whole-page paint investigation. Load averages rose from 9.8
to 18 during this run, so treat the split between modes as rough.

A CDN edge is never in the path locally. No result claims to measure one.

## 5. Production consumer from packed artifacts

`benchmarks/nextjs-browser-bench/scripts/run-production-consumer.ts` packs
`c15t` and its workspace dependencies with `bun pm pack`, installs the
tarballs into a Next.js 16 App Router app outside the workspace, overrides
every `@c15t/*` package to its tarball, and runs `next build` (Turbopack) and
`next start`. The app uses the aggregate `c15t/react/styles.css` import, a
custom light and dark theme, `resolveConsent` from `c15t/next/server` behind
the `c15t/next/api` manifest route, and the deferred `ConsentDialog`. An arm
can also be another built checkout, a directory of tarballs, or a published
version, and arms are measured interleaved.

Stylesheets on both routes, alpha.2 artifacts (gzip body bytes):

| Stylesheets | Count | Bytes | Class selectors in more than one stylesheet |
| --- | ---: | ---: | ---: |
| Initial load | 4 | 22,526 | 48 |
| After opening the dialog | 7 | 30,564 | 127 |

The aggregate stylesheet defines 200 classes. Every class in the other six
stylesheets is also in it. The workspace-linked benches did not show this.

## 6. The React `C15T_CSS=styles` arm

This manual arm of `react-browser-bench` was meant to compare the aggregate
stylesheet with per-component CSS on the `banner-css` page. It has not built
since the v3 exports change in `bbfcc04bb`. Its shim imported
`@c15t/ui/styles/components/consent-banner.module.css` and its extras reused
`button.module.css`, and both specifiers now resolve to JavaScript class
maps. Turbopack failed with `missing VAR_MODULE_GLOBAL_ERROR in template` and
webpack with `Selector ":root" is not pure`. The shim was also stale: it kept
the old monolith keys and dropped `rights`, `rightLink` and the overlay
classes the banner now reads.

The v3 class maps already are the CSS-module class maps, so the shim and the
aliases are gone. Both builds now load the same JavaScript and differ only in
the stylesheets they import explicitly:

- default build: `@c15t/react/styles.css`.
- `C15T_CSS=styles` build: the banner's component stylesheets
  (`consent-banner`, `consent-actions`, `button`, `legal-links`,
  `branding`), built into `.next-css-styles`.

Neither build relies on a class map importing its CSS. Component stylesheets
carry no default tokens, and the aggregate is the only published token
source. With only the bench's 1 ms motion override, the component-CSS banner
renders with a transparent card and square corners. The page therefore passes
the full default theme in both builds, and the provider writes every token
inline. Each `banner-css` sample now fails if the banner card is transparent
or square.

Same machine, 7 samples after 1 warm-up, arms run one after the other rather
than interleaved, so treat the timings as a smoke check only:

| `@c15t/ui` build | Arm | Stylesheets | CSS bytes | Banner paint | Banner ready |
| --- | --- | ---: | ---: | ---: | ---: |
| `v3` (`40032552c`) | aggregate | 4 | 23,509 | 76 (64–96) ms | 69.3 (59.0–89.7) ms |
| `v3` | component CSS | 3 | 7,063 | 64 (60–84) ms | 59.1 (53.4–74.0) ms |
| #1191 (`7eadda5b1`) | aggregate | 1 | 16,446 | 60 (56–64) ms | 53.7 (51.7–58.6) ms |
| #1191 | component CSS | 1 | 5,838 | 84 (76–88) ms | 75.0 (68.2–81.4) ms |

Both arms build with Turbopack and with `next build --webpack` on both
`@c15t/ui` builds. The banner's computed styles match across all four rows:
white card, 12 px radius, and 8 px button radius. On `v3` the aggregate arm
also loads three component stylesheets that duplicate its rules, which is
the issue #1191 fixes.

## Reproduce

Build the packages first (`bun turbo run build --filter=c15t...`) and install
the Playwright browser. From `benchmarks/<harness>`:

```sh
bun run build
bunx tsx scripts/run-bench.ts --scenario saved-consent-accept --iterations 7 --warmup 1
bunx tsx scripts/run-bench.ts --scenario saved-consent-reject --iterations 7 --warmup 1
```

Every harness accepts `--port` or `C15T_BENCH_PORT`, plus `--profile mobile
--init-latency-ms 200` for condition B. The production consumer:

```sh
cd benchmarks/nextjs-browser-bench
bunx tsx scripts/run-production-consumer.ts --arm head=workspace \
  --iterations 7 --warmup 1 --output-dir /tmp/consumer-results
```

Its `summary.md` holds the tables above; per-scenario JSON sits beside it.

The CSS arms, from `benchmarks/react-browser-bench`:

```sh
bun run build
C15T_CSS=styles bun run build
bunx tsx scripts/run-bench.ts --scenario banner-css
C15T_CSS=styles bunx tsx scripts/run-bench.ts --scenario banner-css
```

The second run writes `banner-css-css-styles.json`.

## Not covered

- Field data, CDN behaviour, and deployed Vercel functions.
- The consumer's fixture manifest comes from the harness's workspace schema
  package. A build with an incompatible manifest format needs a matching
  fixture.
- `bannerFirstFrameMs` bounds when paint could happen. Element Timing is the
  paint measurement, and Chromium does not emit it for every banner.
