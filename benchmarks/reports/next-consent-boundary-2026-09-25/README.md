# Next.js consent boundary and first paint

The c15t docs site regressed first contentful paint after moving to alpha.2,
including for returning visitors whose consent was already stored. Its layout
awaits `resolveConsent` inside `<Suspense fallback={null}>` around the whole
page, which is also the default in the App Router guide on `v3`. This report
reproduces that layout in a packed-artifact consumer and compares it with the
promise form and with browser initialization.

## Result

Awaiting consent above the page delays first paint by about 300 ms whenever
the browser paints a frame, or reveals another Suspense boundary, before it
parses the chunk that carries the page. React then holds the page's reveal
until 300 ms after that frame (`$RT + 300` in the streamed runtime). A warm
manifest does not avoid it. Passing the pending `resolveConsent` promise
instead keeps the page in the first chunk, so nothing waits.

Median first contentful paint for the docs route, 9 interleaved samples per
arm:

| Condition | Visit | a: browser init | b: awaited, page in Suspense | c: promise | d: b with alpha.2 CSS |
| --- | --- | ---: | ---: | ---: | ---: |
| 4× CPU, HTTP/2 | New, warm manifest | 92 (84–148) | 396 (108–432) | 92 (84–108) | 408 (128–432) |
| 4× CPU, HTTP/2 | New, cold manifest, 200 ms backend | 92 (88–148) | 396 (388–432) | 92 (88–108) | 408 (388–428) |
| 4× CPU, HTTP/2 | Saved accept | 88 (80–116) | 388 (92–396) | 92 (88–108) | 392 (96–412) |
| 4× CPU, HTTP/2 | Saved reject | 92 (84–100) | 392 (148–404) | 92 (88–112) | 392 (196–420) |
| B, static assets cached, HTTP/1.1 | New, warm manifest | 256 (252–260) | 560 (260–620) | 252 (248–268) | 564 (560–608) |
| B, static assets cached, HTTP/1.1 | Saved accept | 260 (252–360) | 556 (252–560) | 252 (252–268) | 560 (552–592) |
| B, static assets cached, HTTP/1.1 | Saved reject | 260 (252–264) | 560 (556–568) | 256 (248–260) | 560 (256–564) |
| B, empty HTTP cache, HTTP/2 | New, warm manifest | 520 (512–532) | 532 (520–552) | 528 (516–540) | 548 (536–552) |
| B, empty HTTP cache, HTTP/2 | New, cold manifest | 524 (516–536) | 548 (532–568) | 528 (520–548) | 564 (544–588) |
| Native, HTTP/2 | New, warm manifest | 40 (32–60) | 56 (44–60) | 52 (36–60) | 48 (40–68) |

Milliseconds, median (min–max). B is 4× CPU, 170 ms latency, 1,125,000 B/s
down, 187,500 B/s up, and 200 ms on backend manifest requests.

The number of awaited samples whose page content stayed hidden at least 80 ms
after its chunk was parsed:

| Condition | b | d |
| --- | ---: | ---: |
| 4× CPU (new warm, new cold, saved accept, saved reject) | 7, 9, 8, 8 of 9 | 8, 9, 8, 9 of 9 |
| B, static assets cached (new, saved accept, saved reject) | 8, 6, 9 of 9 | 9, 9, 8 of 9 |
| B, empty HTTP cache (all four visits) | 0 of 36 | 0 of 36 |
| Native (all four visits) | 3 of 36 | 1 of 36 |

With an empty HTTP cache under B the stylesheet finishes at about the same
time as the HTML, so the browser paints nothing until the whole page is
parsed and the reveal is not held. The same arms on the same profile, measured
earlier under heavy machine load (load average rising from 7 to 168) and
without the sibling boundary, were held in 29 of 36 samples and gave 928,
1,068, 988 and 1,000 ms for b against 592, 616, 612 and 664 ms for c
(`results/b-empty-http-cache-no-sibling-loaded-machine.json`). Whether the
delay occurs depends on timing; when it does, it costs about 300 ms.

## Attribution for the site's two deltas

The site measured +400 ms FCP in a direct browser run (profile B) and +150 ms
in Lighthouse mobile. They are different measurements.

- **Page-wide boundary: most of the direct-browser delta.** On the site, the
  instrumented stream shows `<SpeedInsights />`, which wraps itself in
  `Suspense`, revealing first at 138–157 ms and the page revealing at exactly
  `$RT + 300` (457, 439 and 467 ms). The consumer reproduces that sequence and
  a 296–308 ms median FCP increase in the conditions where the reveal is held.
  Confidence: high for the mechanism, medium for the exact share on the site,
  whose CPU, CSS and JS differ.
- **CSS: the Lighthouse delta, and little of the direct-browser one.**
  Lighthouse's simulated FCP was 902 ms for a, b and c in both page sizes; its
  simulation does not include the reveal timer (the observed trace did:
  element render delay 371 ms for b against 89 ms for c, one run each).
  Alpha.2's CSS (5 files, 26,801 B) against the #1191 CSS (1 file, 18,721 B)
  added 150 ms of simulated FCP on a small page (1,053 against 903 ms, an
  earlier build without the sibling boundary) and nothing on the docs-sized
  page. In direct browser runs d was between 8 ms faster and 16 ms slower
  than b.
  Confidence: medium; the site's own one-line CSS experiment recovered its
  150 ms.
- **Client resources and hydration: not measurable here.** All arms load the
  same 8 scripts (201,814 B). In a and c, FCP precedes hydration (by about
  25 ms natively and 160–190 ms under 4× CPU), so JavaScript is not on their
  first-paint path; b waits on a timer, not on JavaScript. The site's +22 KB of v3 JavaScript belongs to the payload
  investigation.

## Banner timing

The promise form mounts the banner after hydration. Median times, new
visitor, warm manifest:

| Condition | Banner in DOM, b | Banner in DOM, c | Banner ready, b | Banner ready, c |
| --- | ---: | ---: | ---: | ---: |
| 4× CPU | 332 | 282 | 467 | 391 |
| B, static assets cached | 497 | 432 | 625 | 542 |
| B, empty HTTP cache | 464 | 739 | 750 | 845 |
| Native | 33 | 79 | 80 | 183 |

"Ready" is hydrated, visible, with the accept button's entry animation
finished. Where the awaited page is held, its banner is held too, and the
promise form shows the banner first.

## Consent enforcement

`results/enforcement.json` checks arms a, b and c on `/embed`, which renders a
marketing `ConsentGate` iframe and loads a measurement-gated script through
the provider's `scripts` option. Assertions are on browser network requests.
Each cell ran 3 times per arm:

| Manifest | New visitor | Saved accept | Saved reject |
| --- | --- | --- | --- |
| Warm | No script or iframe request until Accept; both after | Script requested within 3 ms of policy resolving | No request |
| Cold, 200 ms | Same | Same | No request |
| 503 on server and browser | No request in 3 s | No request | No request |
| Hangs (10 s timeout) | No request in 14 s | No request | No request |

The consent probe records policy resolution in an effect, so it can trail the
script loader by a few milliseconds. With a saved accept, arm b's server had
already resolved the grant, so its server HTML contained the iframe, which
loaded before hydration and then again when React moved it out of the hidden
segment. The promise form rendered the page in 24–44 ms in every failure case;
the awaited form was blank for 10 s when the manifest hung.

`ConsentGate` reads `Date.now()` while rendering. Under `cacheComponents`, a
page that renders it in the static shell (arms a and c) fails `next build`;
the consumer wraps it in `Suspense`. The same error occurs with the alpha.2
packages.

## Without `cacheComponents`

`results/cpu4-without-cache-components.json` repeats the 4× CPU run with
`cacheComponents` off, adding e, which awaits in an async layout without
`Suspense` (the CLI template and `examples/nextjs`). Median FCP for b, c and e:
116, 96 and 104 ms (new visitor, warm); 392, 88 and 96 ms (saved accept);
396, 92 and 304 ms (cold manifest, where e's time to first byte rose to
216 ms). e puts the banner in the first chunk without the reveal delay but
blocks the response on resolution.

## Method

- Consumer: Next.js 16.3.4 App Router, Turbopack production build,
  `cacheComponents: true`, React 19.2.8, Tailwind CSS 4.3.3, `next-themes`,
  the site's colour-only theme, `ConsentBanner` and deferred `ConsentDialog`,
  and a `<SpeedInsights />` stand-in with its own `Suspense` boundary.
  c15t is installed from packed tarballs outside the workspace.
- Only `components/arm.tsx` differs between arms (`consumer/arms/`). Arms a,
  b and c use c15t packed from `fix/ui-css-delivery-dedupe` (PR #1191,
  `7eadda5b1`); d uses `40032552c` (alpha.2).
- The docs route renders about 206 KB of HTML, of which about 95 KB follows
  the shell in arm b, similar to the site's docs page (188 KB and 104 KB). The
  measured build generated the 90 sections as literal JSX; the committed
  `app/docs/page.tsx` maps over them and renders the same `<main>` markup,
  with a response 1.2 KB larger.
- The same-origin manifest and init routes use `createNextConsentRouteHandlers`.
  A `bench-manifest` cookie gives a sample its own upstream URL: a cold SDK
  manifest cache in a warm process, or an upstream that answers 503 or never
  answers.
- Chromium 149.0.7827.55 through Playwright 1.61.1, 1280×720, a new context
  per sample, CDP throttling. HTTP/2 through a local TLS proxy
  (`scripts/h2-proxy.mjs`). Chromium does not cache responses from an origin
  with a certificate error, so the cached-assets runs use HTTP/1.1 directly;
  the page is loaded once in the same context first.
- Milestones come from the page: a MutationObserver on the page's
  `data-bench-content` element (chunk parsed, then visible outside the hidden
  segment), wrappers around React's `$RC`/`$RV`/`$RT`, paint and LCP
  observers, resource timing for CSS, and the consent probe for hydration and
  banner readiness. Server resolution time is recorded in the route.
- Lighthouse 13.5.0 mobile (simulated throttling), 7 runs per arm.
- Arms are interleaved with a rotating order after one warm-up per arm and
  scenario. Every result file records the load average at the start and end
  of each scenario. The machine (Apple M5 Pro, 18 cores, macOS 27.0) was
  running other benchmarks; load averages were 6–12 for the runs in the tables
  unless stated otherwise.

Not measured: a Vercel deployment, field data, and the site itself. The
consumer's server render of the page is cheap; a slow page render would add
to b's delay because b renders the page per request.

## Reproduce

Build c15t in a checkout, then from this directory:

```sh
scripts/install.sh <c15t-checkout> /tmp/paint
scripts/build-arm.sh /tmp/paint a a 1
scripts/build-arm.sh /tmp/paint b b 1
scripts/build-arm.sh /tmp/paint c c 1
scripts/serve.sh /tmp/paint a 4211 200
scripts/serve.sh /tmp/paint b 4212 200
scripts/serve.sh /tmp/paint c 4213 200

openssl req -x509 -newkey rsa:2048 -nodes -days 30 -subj /CN=127.0.0.1 \
  -keyout /tmp/paint/key.pem -out /tmp/paint/cert.pem
node scripts/h2-proxy.mjs 4221 4211 /tmp/paint &
node scripts/h2-proxy.mjs 4222 4212 /tmp/paint &
node scripts/h2-proxy.mjs 4223 4213 /tmp/paint &

# Tools live outside the workspace.
mkdir -p /tmp/paint-tools && cd /tmp/paint-tools
npm init -y && npm i playwright@1.61.1 lighthouse@13.5.0 chrome-launcher@1.2.1
S=<this directory>/scripts
node $S/paint.mjs --condition cpu4 --samples 9 --route /docs --out cpu4.json \
  a=https://127.0.0.1:4221@4211 b=https://127.0.0.1:4222@4212 c=https://127.0.0.1:4223@4213
node $S/paint.mjs --condition B --http-cache warm --samples 9 --route /docs \
  --scenarios fresh,saved-accept,saved-reject --out b-warm.json \
  a=http://127.0.0.1:4211@4211 b=http://127.0.0.1:4212@4212 c=http://127.0.0.1:4213@4213
node $S/enforce.mjs --samples 3 --out enforcement.json \
  a=https://127.0.0.1:4221 b=https://127.0.0.1:4222 c=https://127.0.0.1:4223
node $S/lh.mjs 7 lighthouse.json /docs a=https://127.0.0.1:4221 b=https://127.0.0.1:4222
python3 $S/summarize.py cpu4.json
python3 $S/compact.py paint cpu4.json cpu4.compact.json
```

`scripts/stream.mjs <url> [cookie]` prints chunk timings for a raw HTTP read
and whether the page content sits in a hidden Suspense segment.
