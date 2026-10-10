# Dialog open time after the quiet preload (#1439)

PR #1439 delayed the preferences dialog's download from the first idle moment
after `load` until the page had gone quiet (no resource finishing for 1 s and
no visible image loading, capped at 10 s after `load`). It saved about 17 KB of
c15t bytes competing with a hero image on mobile, with an LCP change inside the
run-to-run spread.

This run measured what that costs a visitor who opens the dialog. The cost was
too high for the gain, and #1439 was closed without merging. The data is kept
here in case the idea comes back.

Throttling is DevTools' Slow 4G with CPU 4x. Times are milliseconds from the
click to the dialog first being visible, median (p75).

| Click at | React before | React after | Nuxt before | Nuxt after |
| --- | --- | --- | --- | --- |
| Banner shows | 848 (852) | 846 (852) | 1614 (1645) | 1630 (1636) |
| `load` + 0.5 s | 562 (586) | 823 (847) | 1624 (1649) | 1622 (1645) |
| `load` + 1 s | 69 (202) | 820 (876) | 1608 (1653) | 1625 (1646) |
| `load` + 2 s | 67 (82) | 747 (761) | 1032 (1039) | 1459 (1472) |
| `load` + 5 s | 68 (85) | 67 (79) | 51 (73) | 60 (97) |
| `load` + 12 s | 62 (148) | 61 (87) | 54 (76) | 49 (55) |
| Hover, then click as the banner shows | 646 (654) | 666 (671) | 1464 (1497) | 1480 (1486) |
| Hover, then click at `load` + 1 s | 66 (72) | 599 (606) | 1460 (1489) | 1483 (1490) |

State of the dialog's files at the click, out of 16:

| Click at | React before | React after | Nuxt before | Nuxt after |
| --- | --- | --- | --- | --- |
| `load` + 0.5 s | 14 in flight, 2 cold | 16 cold | 16 cold | 16 cold |
| `load` + 1 s | 9 ready, 7 in flight | 16 cold | 16 cold | 16 cold |
| `load` + 2 s | 15 ready, 1 in flight | 16 cold | 15 in flight, 1 cold | 16 cold |
| `load` + 5 s | 16 ready | 16 ready | 16 ready | 15 in flight, 1 cold |

## Findings

- **The quiet wait opens a cold window of about 2 to 5 s after `load`.** In it,
  a click on Customize waits for the whole dialog download: about 750 to
  820 ms on React instead of about 70 ms, and about 1460 ms on Nuxt instead of
  about 1030 ms at 2 s. Before the change, React's dialog was ready by 1 s.
- **No difference at either end.** A click as the banner appears is cold in
  both versions, and by 5 s both are warm.
- **Hover doesn't close the gap.** Warming on hover starts the download, but
  on Slow 4G it doesn't finish in the 150 ms before the click. React at
  `load` + 1 s goes from 820 to 599 ms, still about 9x the 66 ms before. Nuxt
  barely moves.
- **Nuxt is slow to open at any point before the files arrive.** About 1.5 s
  cold in both versions, partly because Nitro serves the chunks uncompressed
  (see Caveats).

## Files

- `samples.txt`: every completed sample, one line each, from both runs.
- The bench: `benchmarks/react-browser-bench/scripts/run-dialog-open-timing-bench.ts`
  (`bun run --cwd benchmarks/react-browser-bench bench:dialog-open-timing`),
  the `/?hero` page in `benchmarks/vite-react-repro`, the `/client-hero` page in
  `benchmarks/nuxt-browser-bench`, and `benchmarks/shared/assets/hero.jpg`.

## Method

- Before: `origin/v3` at `cb4240555`. After: PR #1439 at `830ea62b6`. Both
  were built from source in their own checkout: the packages with `bun turbo run
  build`, then the two bench apps.
- Apps:
  - React: `benchmarks/vite-react-repro`, built with `vite build` and served with
    `vite preview`. The page is `/?hero`, with the stock `ConsentBanner` and
    `ConsentDialog` in offline mode, animations off, and the default
    `preloadDialog: 'idle'`.
  - Nuxt: `benchmarks/nuxt-browser-bench`, built with `nuxt build` and served
    by its Nitro server. The page is `/client-hero`, which is the `ssr: false`
    `/client` page plus the hero. It runs in hosted mode against the bench's
    own `/api/bench-consent` backend with no added latency, so the banner
    waits for an `/init` round trip, and the dialog animates in.
- Hero: both pages render a 159 KB, 1200×800 progressive JPEG, but only after
  the window `load` event. That is how a single-page app's main image often
  arrives, and it is what the PR's quiet wait is for. The hero was the LCP
  element in every sample.
- The bench serves each app on localhost only for the run and stops the
  servers afterwards.
- Browser: Playwright 1.61.1 with headless Chromium 149.0.7827.55, a
  412×915 viewport and no touch. Every sample launches its own browser, so the
  HTTP cache, cookies and storage start empty each time.
- Throttling is set through CDP before navigation:
  - `slow-4g`, which copies DevTools' Slow 4G preset: CPU 4x,
    `Network.emulateNetworkConditions` with 180,000 B/s down, 84,375 B/s up
    and 562.5 ms latency.
  - `none`: no CPU or network throttling.
- Click points: the bench waits for the banner and its Customize button to
  show, then for `loadEventEnd` plus the delay, and calls the button's DOM
  `click()`. This is an untrusted click with no pointer or focus events before
  it, so it shows what a keyboard or screen-reader user, or a fast tap, gets.
  `banner` clicks as soon as the banner shows.
- Hover cells use a real `page.hover()` on Customize. The bench waits 150 ms
  after the button's first `pointerover`, then clicks.
- Timing: a MutationObserver records the dialog root's insertion (mounted).
  Animation frames sample the product of the root's and its ancestors'
  opacity. First visible means opacity above zero with nonzero height; fully
  visible means opacity of at least 0.999. Times are milliseconds after the
  click.
- Dialog chunk:
  - The dialog files are read from each build: the chunk holding the stock
    dialog's `consent-dialog-root` test id, plus the files its import pulls
    in (Vite's `__vite__mapDeps` preload list and the static imports from
    there), minus anything the page's HTML already loads. That gives 3 JS
    files and 66.6 KB for React, and 4 JS plus 3 CSS files and 67 KB for Nuxt
    (uncompressed sizes).
  - Requested means the marker chunk's Resource Timing `startTime` came
    before the click. Ready means every dialog file's `responseEnd` came
    before the click.
  - The preload start is the marker chunk's `startTime`.
- LCP is the last `largest-contentful-paint` entry outside the dialog.
- Each round runs every cell for both apps and both arms, and alternates which
  arm goes first. Medians are the middle value, or the mean of the two middle
  values; p75 interpolates.
- Two copies of the run (A and B in `samples.txt`) ran at the same time and
  were stopped after 8 rounds each, once the result was clear. Their medians
  agree within about 20 ms in almost every cell, so the tables pool them: 16
  samples per cell, 15 for two Nuxt hover cells that lost a sample to the
  stop.

## Caveats

- `vite preview` gzips responses. Nitro serves `_nuxt` chunks uncompressed.
  Under Slow 4G, Nuxt's dialog files therefore take longer to arrive than they
  would from a CDN. The before-after comparison is still like for like.
- The vite app needs `resolve.dedupe: ['react', 'react-dom']`. The repro pins
  React 19.2.0, while `@c15t/react` resolves 19.2.7 from the workspace. Without
  dedupe, the build bundles two copies and throws on the first hook. Both arms
  were built with it.
- These are DOM and style measurements, not screen captures, and they don't
  measure physical pointer latency.
- The machine was shared with other work and with the second copy of the run;
  the load average was between 4 and 7. Throttling and interleaving even this out between arms, but
  single samples vary by a few hundred milliseconds where a download is in
  flight.

## Reproduce

Each arm must be a checkout with the packages and both apps built:

```sh
bun install
bun turbo run build --filter='./packages/*'
bun run --cwd benchmarks/vite-react-repro build
bun run --cwd benchmarks/nuxt-browser-bench build
```

Then, from either checkout:

```sh
BENCH_ARMS=before=/path/to/v3,after=/path/to/pr \
BENCH_OUTPUT_DIR=/tmp/dialog-open-timing/slow-4g \
bun run --cwd benchmarks/react-browser-bench bench:dialog-open-timing
```

Options:

- `BENCH_PROFILE`: `slow-4g` (default), `mobile` or `none`.
- `BENCH_ITERATIONS`: rounds per cell; the default is 15.
- `BENCH_LATE_ITERATIONS`: rounds for the 12 s cell; the default is 10.
- `BENCH_APPS`: `react,nuxt`.
- `BENCH_CELLS`: a comma-separated subset of cell ids.

Each arm writes `<arm>.json`, holding the samples, per-cell medians and p75s,
the dialog files, the commit and the throttle settings.
