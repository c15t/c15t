# Cold-start decomposition, 2026-09-25

The alpha.2 docs-site run reported a new `next start` process against a
second request on the homepage under condition B:

| State | TTFB | FCP | Banner ready | Origin `/manifest` calls |
| --- | ---: | ---: | ---: | ---: |
| New Next process | 629 ms | 1,392 ms | 2,025 ms | 7/7 |
| Second request | 3 ms | 1,100 ms | 1,556 ms | 0/7 |

This report splits that into framework process start, c15t server module
initialisation, and manifest latency, and measures each cache state on its
own. Result: the manifest fetch accounts for none of the 626 ms TTFB gap, and
loading c15t's server code for about 4 ms of it. The rest is Next.js and the
site's own modules loading on the first request. The manifest round trip lands after the first
byte, in the chunk that carries the banner.

No SDK change came out of this. The manifest cache coalesces concurrent cold
requests and keeps tracking blocked when a cold fetch fails or hangs.

## Why the site paid an origin fetch on every restart

The site passes `manifestRevalidateSeconds: 0` to
`createNextConsentRouteHandlers` (`packages/c15t-v3/src/server.ts` in the
Inth monorepo) so a purged CDN manifest is not held by a second cache. That
turns off the Next Data Cache for the manifest route, which leaves only the
SDK's in-process cache, and a new process starts with it empty.

The visit-definitions harness (#1190) uses the handler default, 300 s. Its
manifest response goes into the Data Cache under `.next/cache/fetch-cache`,
which survives a restart, so its restarted process made no origin call.

Both use the same resolution path: `resolveConsent` fetches the same-origin
manifest route, which fetches the backend. Nothing cleared `.next/cache` on the
site; its `fetch-cache` holds no manifest entry at all. The consumer below
reproduces both: with the site's setting a restarted process calls the origin
9/9 times, and with the default 0/9.

## Setup

- c15t `origin/v3` at `40032552c` (alpha.2). The consumer installs packages
  packed from `7eadda5b1` (`fix/ui-css-delivery-dedupe`, #1191), the corrected
  CSS delivery.
- Next.js 16.3.4 (Turbopack production build), React 19.2.8, Node 24.19.0,
  Chromium 148 (Playwright 1.60). Apple silicon, 18 cores. Other benchmarks ran
  on the machine at the same time; load averages are listed with each table.
- `harness/consumer` is the #1190 production consumer (custom theme,
  aggregate CSS, page-wide `<Suspense fallback={null}>` around
  `await resolveConsent()`, deferred dialog) with three changes. The manifest
  proxy route is the site's shape (`/c15t/manifest`, `/c15t/init`). The backend
  is an external process (`harness/mock-backend.mjs`) serving the manifest
  captured from the seeded alpha.2 gateway, with the gateway's headers:
  `s-maxage=300, stale-while-revalidate=86400`, an ETag, and
  `x-c15t-manifest-cdn-ttl: 604800`. A stand-in tracking script is gated on
  `measurement`. Server timing marks (`app/bench-timing.ts`) record request
  phases.
- `harness/baseline` is the same app with every c15t import removed.
- Two route configurations:
  - **D**, documented default: SDK in-process cache plus the Next Data Cache
    (300 s).
  - **S**, site-like: `C15T_MANIFEST_REVALIDATE_SECONDS=0`, SDK in-process
    cache only.
- Two network conditions:
  - **B**: 4× CPU, 170 ms, 1,125,000/187,500 B/s, +200 ms on backend
    `/manifest` and `/init`.
  - **L**: +200 ms backend latency only, no browser throttling.
- Each sample uses a new browser context. Samples are interleaved by round
  (condition, then configuration, then a rotated state order). One warm-up
  round, then 9 measured rounds: 180 samples. All 108 new-process samples
  carry that process's own `instrumentation.register` mark, and no warm
  sample restarted.

States, in the #1190 cold-state vocabulary plus the Data Cache:

| State | Label | How |
| --- | --- | --- |
| a | `browser:cold sdk-manifest:warm data-cache:warm process:warm cdn:not-measured` | Long-running server, manifest URL already fetched |
| b | `browser:cold sdk-manifest:cold data-cache:cold process:warm cdn:not-measured` | Same server; the request carries a new upstream manifest URL, which misses both caches |
| c | `browser:cold sdk-manifest:cold data-cache:warm-on-disk process:cold cdn:not-measured` | New `next start`, `.next/cache` kept |
| d | `browser:cold sdk-manifest:cold data-cache:cold process:cold cdn:not-measured` | New `next start`, `.next/cache` deleted |
| e | same as d, `backend:instant` | As d, with the backend answering at once |

Configuration S never writes the Data Cache, so its `data-cache` field does not
apply; for S, state c is a restart with an empty manifest cache.

Metrics: TTFB is Navigation Timing `responseStart`. Chrome's latency emulation
does not delay it, so it is server time; the brief's 3 ms warm TTFB under B
shows the same. First chunk is the first CDP `Network.dataReceived` for the
document, after emulation. Banner in HTML is the chunk whose running decoded
byte count passes the end of `data-testid="consent-banner-root"` in the final
body. Banner ready is the probe's hydrated readiness (visible, not animating).
Origin counts come from the mock backend.

## Results

Medians, with the range in brackets, in ms. n = 9 per row. "FCP slow mode" is
the number of samples in the upper of FCP's two modes (over 600 ms under B,
over 250 ms under L).

### Condition B (load average 5.8 to 10.5)

| Config | State | TTFB | First chunk | Banner in HTML | FCP | FCP slow mode | Banner ready | Origin `/manifest` | Origin `/init` |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| D | a | 4 (3–5) | 180 (177–181) | 184 (181–185) | 472 (456–760) | 4/9 | 750 (710–829) | 0/9 | 0 |
| D | b | 4 (2–6) | 179 (178–181) | 212 (211–215) | 752 (464–768) | 5/9 | 821 (739–849) | 9/9 | 0 |
| D | c | 82 (70–104) | 180 (177–181) | 182 (179–183) | 760 (456–768) | 7/9 | 827 (719–840) | 0/9 | 0 |
| D | d | 85 (77–105) | 178 (178–182) | 322 (310–352) | 744 (444–760) | 5/9 | 808 (736–831) | 9/9 | 0 |
| D | e | 85 (76–92) | 180 (178–181) | 183 (180–187) | 756 (464–764) | 7/9 | 822 (719–834) | 9/9 | 0 |
| S | a | 4 (3–6) | 179 (177–180) | 182 (180–186) | 752 (460–768) | 6/9 | 815 (714–839) | 0/9 | 0 |
| S | b | 4 (3–4) | 179 (176–180) | 212 (211–215) | 756 (452–768) | 6/9 | 816 (739–837) | 9/9 | 0 |
| S | c | 88 (75–182) | 180 (178–188) | 322 (305–435) | 752 (744–768) | 9/9 | 821 (811–848) | 9/9 | 0 |
| S | d | 87 (74–116) | 179 (178–181) | 323 (304–361) | 752 (456–760) | 6/9 | 819 (726–827) | 9/9 | 0 |
| S | e | 88 (73–124) | 179 (179–180) | 182 (181–187) | 756 (460–768) | 6/9 | 818 (716–843) | 9/9 | 0 |

### Condition L (load average 5.9 to 11.3)

| Config | State | TTFB | First chunk | Banner in HTML | FCP | FCP slow mode | Banner ready | Origin `/manifest` | Origin `/init` |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| D | a | 4 (3–6) | 7 (6–9) | 8 (7–11) | 40 (24–328) | 2/9 | 62 (55–342) | 0/9 | 0 |
| D | b | 4 (3–6) | 5 (4–7) | 210 (208–213) | 332 (328–348) | 9/9 | 345 (337–358) | 9/9 | 0 |
| D | c | 82 (74–134) | 83 (75–136) | 117 (105–179) | 136 (124–216) | 0/9 | 171 (155–239) | 0/9 | 0 |
| D | d | 85 (77–121) | 86 (78–124) | 315 (307–359) | 408 (400–468) | 9/9 | 418 (412–478) | 9/9 | 0 |
| D | e | 89 (80–135) | 90 (81–137) | 123 (113–195) | 144 (132–436) | 1/9 | 179 (161–448) | 9/9 | 0 |
| S | a | 3 (2–6) | 6 (4–9) | 8 (6–11) | 328 (24–336) | 6/9 | 339 (54–347) | 0/9 | 0 |
| S | b | 3 (3–4) | 5 (4–5) | 209 (207–210) | 328 (324–348) | 9/9 | 341 (338–358) | 9/9 | 0 |
| S | c | 89 (76–261) | 90 (77–269) | 323 (305–582) | 412 (404–620) | 9/9 | 426 (414–631) | 9/9 | 0 |
| S | d | 82 (74–154) | 84 (75–156) | 314 (306–412) | 412 (400–496) | 9/9 | 424 (412–509) | 9/9 | 0 |
| S | e | 83 (76–217) | 85 (78–219) | 113 (111–263) | 284 (140–436) | 5/9 | 326 (164–450) | 9/9 | 0 |

What the states show in this consumer:

- A new process costs about 80 ms before the first byte (c, d, e against a).
  That cost is the same with a 200 ms backend (d) and an instant one (e), so
  it contains no manifest time.
- The manifest round trip moves the banner chunk: +202 ms in a warm process
  (b against a, L) and +192 to +201 ms in a new process (d against e, L).
- A new process moves the banner chunk by another 105 to 115 ms (e against a,
  and d against b).
- Under B, the 170 ms emulated latency hides the new process's 80 ms in the
  first chunk, and client JavaScript sets banner ready at about 750 to 830 ms
  in every state. Only the banner chunk moves.
- With the site's setting (S) a restart pays the full manifest round trip
  (c = d). With the default (D) it does not (c ≈ e), because the manifest
  comes from the Data Cache on disk.
- FCP falls into two modes about 300 ms apart in every state, as #1190 found.
  It follows the Suspense reveal, not a cache. See the page-paint
  investigation.

### Server phases, condition L

Milliseconds after navigation start, medians. Marks come from
`harness/consumer/app/bench-timing.ts`. The two eval columns bracket the evaluation
of `c15t/next/server` and `c15t/next/api` with marker modules imported
immediately before and after them.

| Config | State | `c15t/next/server` eval | `resolveConsent` start | `c15t/next/api` eval | Route start | Origin `/manifest` sent | Route end | `resolveConsent` end | TTFB | Banner in HTML |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| D | a | – | 1 | – | 3 | – | 3 | 4 | 4 | 8 |
| D | b | – | 1 | – | 3 | 5 | 206 | 207 | 4 | 210 |
| D | c | 0.3 | 54 | 1.9 | 77 | – | 85 | 96 | 82 | 117 |
| D | d | 0.3 | 56 | 1.9 | 80 | 86 | 291 | 300 | 85 | 315 |
| D | e | 0.3 | 58 | 2.0 | 84 | 90 | 95 | 104 | 89 | 123 |
| S | c | 0.3 | 59 | 2.1 | 84 | 90 | 294 | 303 | 89 | 323 |
| S | d | 0.3 | 53 | 1.9 | 78 | 83 | 291 | 299 | 82 | 314 |
| S | e | 0.3 | 55 | 2.0 | 79 | 84 | 87 | 96 | 83 | 113 |

In a new process, `resolveConsent` starts about 55 ms after navigation. Its
loopback request to the manifest route takes 23 to 26 ms to reach the handler
(1 to 2 ms when warm), because the route module loads first. When the manifest is not cached, the shell
flushes as the origin request leaves.

### c15t's share of a cold first byte (raw HTTP, 9 interleaved runs each)

A new process with `.next/cache` deleted serves one `GET /` read off the
socket, then a second request in the same process. Load average 6 to 11.

| Variant | Backend delay | Cold TTFB | Cold banner chunk | Warm TTFB | Warm banner chunk | Origin `/manifest` |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| No c15t | 200 | 81 (79–90) | – | 4 (4–5) | – | 0/9 |
| No c15t | 0 | 83 (80–90) | – | 4 (4–6) | – | 0/9 |
| S | 200 | 104 (100–120) | 333 (328–352) | 6 (4–8) | 8 (7–10) | 9/9 |
| S | 0 | 110 (101–130) | 136 (126–159) | 6 (4–7) | 8 (7–10) | 9/9 |
| D | 200 | 114 (101–145) | 343 (329–374) | 5 (3–7) | 8 (7–10) | 9/9 |
| D | 0 | 110 (102–118) | 137 (128–145) | 5 (4–9) | 8 (7–12) | 9/9 |

A second interleaved run separates the loopback route (load average 5 to 7):

| Variant | Cold TTFB | Cold banner chunk | Warm banner chunk | Origin `/manifest` per process |
| --- | ---: | ---: | ---: | ---: |
| No c15t | 80 (77–84) | – | – | 0 |
| S, `resolveConsent` → manifest route → backend | 105 (100–122) | 334 (327–349) | 8 (7–9) | 1 |
| S, `resolveConsent` → backend directly | 94 (91–105) | 316 (313–327) | 208 (207–210) | 2 |

c15t adds about 25 ms to a cold first byte in this small app: about 14 ms for
its modules in the page graph and about 11 ms for the first loopback to the
manifest route. CPU profiles of the same cold request (3 runs, profiling
overhead included) put c15t code execution before the first byte at about
1 ms and compiling c15t's share of the server chunks at about 5.6 ms. The rest
is Turbopack's runtime loading a larger module graph (+14 ms) and more
bundled Next.js code (+6 ms). The 5.6 ms covers every c15t chunk the request loads, before and after the first byte.

## The site's 626 ms

`harness/site-cold.mjs` runs the site build from the brief the same way as
the original `cold.mjs`: a new `next start` per sample, `.next-860/cache` kept,
the seeded gateway behind a proxy adding 200 ms. It reads `/` over raw HTTP.
Seven plain runs and three profiled runs, interleaved, load average 6 to 7:

| Measure | Cold | Warm (same process) |
| --- | ---: | ---: |
| First byte | 570 (515–651) | 4 (3–4) |
| Banner chunk | 942 (893–1,075) | 18 (17–30) |
| Origin `/manifest` calls | 7/7 | 0/7 |
| Origin request sent, after first byte | 110 (97–133) | – |
| Origin round trip through the proxy | 215 (213–223) | – |
| Banner chunk, after the origin answered | 61 (53–76) | – |

The brief's own samples agree: its proxy saw `/manifest` 106 to 212 ms after
the page's TTFB in all 7 runs.

| Part of the cold TTFB gap | Share | Evidence |
| --- | ---: | --- |
| Manifest fetch (200 ms injected plus gateway) | 0 ms | The origin request leaves about 110 ms after the first byte. TTFB does not change between a 200 ms and an instant backend (states d and e). |
| c15t server module initialisation | about 4 ms | Site profiles: 0.0 ms of c15t code before the first byte; the page's c15t chunk (93% c15t) and the manifest route's chunk take 3.4 to 4.4 ms to load. The small consumer's +25 ms is an upper bound. |
| Next.js process start and the site's modules | the remaining ~560 ms | During the first request Next loads route entries across the app (the changelog page takes 43 ms, the docs-ask route 14.5 ms, the OG route 9 ms, middleware 10.7 ms), plus Sentry, OpenTelemetry and Node module loading. |

The earlier v2 site measurement (`cold-main-raw.json`, no server-side consent
resolution at all) had cold TTFB of 532 to 1,344 ms under different
conditions, which fits a framework and site cost.

Where the cold banner goes: 942 ms ≈ 566 ms TTFB gap + about 110 ms before
the manifest request leaves (the process finishes the shell and routes the
loopback request first) + 215 ms manifest + about 61 ms to render, of which
c15t policy resolution is 14 to 15 ms of CPU (mostly `@c15t/schema`). The
site's later FCP and banner-ready on a new process follow from that chunk,
because the whole page sits inside the Suspense boundary.

## Manifest cache behaviour in a running process

`harness/cache.mjs`, backend +200 ms unless noted, results in
`results/cache.json`.

| Check | S (in-process only) | D (in-process + Data Cache) |
| --- | --- | --- |
| 5 concurrent page requests, cold key, warm process | 1 origin call (3/3 runs), banner in all 5 | 1 origin call (3/3) |
| 5 concurrent page requests, new process, `.next/cache` deleted | 1 origin call (3/3), banner in all 5 | 1 origin call (3/3) |
| `s-maxage=2, stale-while-revalidate=10` | Fresh reads make no call. A stale read returns in 9 ms and sends one conditional request (304). The next read makes none. | Same; the conditional request reaches the origin. |
| Stale entry, backend 503 | Stale manifest served with the banner in 10 ms. One failed refresh, then none until the 5 s floor has passed. | – |
| Cold cache, backend 503 | Page 200 without banner markup. The browser retries `/c15t/init` 5 times in 14 s and shows no banner. Tracker not loaded. 5 concurrent requests make 1 origin call; 3 sequential requests make 3. The banner returns once the backend recovers. | Same |
| Cold cache, backend never answers | The page content waits for the route's 10 s fetch timeout (FCP 10,172 ms), then the browser's `/init` waits another 10 s. No banner, tracker not loaded. | – |
| Control | Tracker loads after Accept (1), not after Reject (0) | – |

Concurrent cold requests share one upstream fetch, and a failing or hanging
cold fetch keeps the tracker blocked. That rules out the two defects this
check looked for, a thundering herd and broken enforcement.

Three behaviours are worth an owner's decision, but are not cache defects:

1. A hanging backend on a cold cache holds the page for 10 s in a layout that
   awaits consent around the whole page. The timeout is
   `MANIFEST_FETCH_TIMEOUT_MS` in `manifest-cache-runtime.ts`.
   `resolveConsent` has no shorter render budget.
2. After a cold failure nothing is remembered, so each later request retries
   the origin, one at a time per key. Stale entries have a 5 s floor; cold
   keys do not.
3. Pointing `resolveConsent`'s `manifestURL` at the backend instead of the
   manifest route bypasses both caches. Every render fetched the origin: 5
   concurrent requests made 5 calls, and 5 sequential requests made 5, at
   about 207 ms each. The Next docs define `manifestURL` as the manifest route
   URL, so this is off the documented path.

## Not measured

- The CDN edge. No local run has one in the path; the gateway's seven-day
  CDN TTL was not tested and nothing here argues for changing it.
- Vercel function cold starts and how often they happen. On Vercel the Data
  Cache is not the local `.next/cache`, so how configuration D behaves across
  function instances there is unknown.
- Stale-while-revalidate past its window (a blocking refresh) in the
  consumer. The timeline did not reach it. `benchmarks/manifest-cache-bench`
  exercises the cache in isolation.

## Reproduce

```sh
bun turbo run build --filter=c15t...
cd benchmarks/reports/cold-start-decomposition-2026-09-25/harness
./prepare.sh ../../../..                  # or a directory of packed tarballs
node mock-backend.mjs 4790 &              # external consent backend
node run.mjs --rounds 9                   # states a–e × D/S × B/L
node summarize.mjs                        # tables above
node coldraw.mjs --reps 9                 # no-c15t baseline vs S vs D
node coldraw.mjs --reps 9 --variants base,S,Sdirect --delays 200 --out "${COLD_BENCH_DIR:-/tmp/c15t-cold-start}/results/coldraw-direct.json"
node coldraw.mjs --reps 3 --profile --variants base,S --delays 200 --out "${COLD_BENCH_DIR:-/tmp/c15t-cold-start}/results/coldraw-prof.json"
node analyze-all.mjs                      # CPU profile attribution
node cache.mjs                            # coalescing, TTL, failure checks
```

Work files go to `COLD_BENCH_DIR` (default `/tmp/c15t-cold-start`). Ports:
4721–4722 warm servers, 4731–4732 new processes, 4741–4744 raw cold runs,
4751–4752 cache checks, 4790 mock backend. Playwright's Chromium must be
installed. `site-cold.mjs` and `site-proxy.mjs` need the docs-site build and
the seeded gateway from the originating machine (`COLD_BENCH_SITE`).

`results/` holds the measured runs: `matrix.json` (states), `coldraw.json`,
`coldraw-direct.json`, `cache.json`, and `site-cold.json`.
