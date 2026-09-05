# TanStack Start Browser Bench

Playwright benchmark app for `@c15t/tanstack-start`, built to run head to head
against `benchmarks/nextjs-browser-bench`: same fixture data, same scenario
names, same DOM hooks, same metric list, same Chromium build. The only extra
arm is `manifest-ssr-proxy`, which prices the opt-in same-origin proxy, plus
the `manifest-ssr-root` build variant described under "Root-mounted
provider" below.

## Scenarios

| Scenario | Route | What it measures |
| --- | --- | --- |
| `baseline` | `/baseline` | Page floor: identical shell, no consent code. |
| `client` | `/client` | `ConsentProvider` with `hosted({ url: '/api/bench-consent' })`, `ssr: false`, so the provider mounts and runs init in the browser. |
| `manifest-client` | `/manifest-client` | `custom(createManifestTransport(...))` reading the same-origin `/api/c15t/manifest` route, `ssr: false`. |
| `ssr` | `/ssr` | Loader fetches `/api/bench-consent/init` server-side on every request and folds it in with `mergeInitIntoConsentConfig`; `ConsentBoundary` with `initRoute={false}`. Direct-init semantics, matching the Next `ssr` arm. |
| `manifest-ssr` | `/manifest-ssr` | Loader runs `createConsentConfigHandler({ backendURL, manifestURL })` through the in-process manifest cache; `ConsentBoundary` with the default same-origin init route. Saves post to the fixture directly. |
| `manifest-ssr-proxy` | `/manifest-ssr-proxy` | Same prefetch, but `ConsentBoundary backendURL="/api/c15t-proxy"`, a second `createConsentServerRoute({ proxy: true })` mount, so the accept click's `POST /subjects` takes one hop through the Start server. Start only. |
| `repeat-visitor` | derived | After each measured `client` iteration a second browser context loads `/client` and the runner measures the Open Preferences click, exactly as the Next runner does. Note that neither runner preseeds the consent cookie for this arm. |
| `manifest-ssr-root` | `/manifest-ssr` in the `dist-root/` build | `--root-provider` only. Same route and metrics as `manifest-ssr`, but the provider and the manifest prefetch loader live in `__root.tsx` and the route renders only the page shell. Built with `C15T_BENCH_ROOT_PROVIDER=1` (`bun run build:root`). |

There is no `rsc-ssr` arm: TanStack Start has no server components, so the
Next `rsc-ssr` scenario has no equivalent and is reported as Next-only.

Fixture routes live under `src/routes/api/bench-consent/` and are a copy of
the Next arm's `fixture.ts` (policy id, fingerprint, revision, and
translations are byte-identical, so both arms resolve the same policy). They
honour `C15T_BENCH_INIT_LATENCY_MS` and the `?cold=` token the same way.

## Running

```bash
bun run --cwd benchmarks/tanstack-start-browser-bench bench -- --iterations 15 --warmup 2
bun run --cwd benchmarks/tanstack-start-browser-bench bench -- --profile mobile --init-latency-ms 200
bun run --cwd benchmarks/tanstack-start-browser-bench bench -- --scenario manifest-ssr-proxy
bun run --cwd benchmarks/tanstack-start-browser-bench bench -- --cold-manifest true
bun run --cwd benchmarks/tanstack-start-browser-bench bench -- --root-provider
```

The runner builds `dist/` with `vite build` when `dist/server/server.js` is
missing, then serves it on `127.0.0.1:4314` through `scripts/serve.mjs`.
`vite build` emits the server as a bare `{ fetch }` handler with no listener,
so `node dist/server/server.js` alone exits immediately; `serve.mjs` hosts it
with srvx's `node:http` adapter and serves `dist/client` as static files, which
is the Node hosting shape TanStack Start documents for that output. Results
land in `.benchmarks/current/browser-runtime/tanstack-start/`.

`--root-provider` builds the root-mounted variant into `dist-root/` with
`bun run build:root` when `dist-root/server/server.js` is missing, serves it
through the same `serve.mjs` (`DIST_DIR=dist-root`), and runs only the
`/manifest-ssr` route, written as scenario `manifest-ssr-root` with the
`manifest-ssr` budgets. Both builds can sit side by side; the default arm
never reads `dist-root/`.

For the head-to-head report run both arms, then:

```bash
bun run bench:frameworks
```

which writes `.benchmarks/compare/frameworks.md` and `frameworks.json`.

## What is and is not equivalent

- **Server runtime.** Next runs `next start` (its own Node server). Start runs
  the Vite build's fetch handler behind srvx on `node:http`. Both are Node
  servers, but TTFB includes different framework routing layers.
- **`client` shell.** Next server-renders the page shell of its client
  component and only the consent state is client-side. Start's `ssr: false`
  renders the whole route in the browser, so its first HTML carries no `<main>`.
  The banner path is client-only in both.
- **`ssr` on the server.** Both arms call `/api/bench-consent/init` on every
  request. Start uses a hand-written loader for this because the package
  helper always goes through the manifest cache; see `src/bench/loaders.ts`.
- **`manifest-ssr` on the server.** Next's `prefetchInitialConsent` fetches
  its own `/api/c15t/manifest` route over HTTP each request and the route
  answers from the in-process cache. Start's prefetch refuses self-fetches and
  reads the same cache directly. That saved hop is a real adapter difference,
  not a harness artefact.
- **`manifest-ssr` saves.** The Next arm's boundary has no `backendURL`, so
  it runs in offline mode and the accept click never posts. The Start arm is
  in hosted mode and posts to the fixture. Compare the Next number against
  Start's `interactionLatencyMs` with that in mind, and use `manifest-ssr`
  versus `manifest-ssr-proxy` within Start to price the proxy hop.
- **`initRequestsAfterLoad` on SSR arms.** The React provider dispatches init
  eagerly on the client whenever the transport is hosted, even with an
  authoritative prefetch, so every hosted SSR arm shows one browser init
  request in both frameworks. Only Next's offline-mode `manifest-ssr` and
  `rsc-ssr` arms show zero. The `count-eq 0` budget copied from the Next
  runner therefore fails on the hosted arms of both frameworks.
- **Cache warmth.** Manifest arms warm the server cache during warmup
  iterations; the first cold fill is only visible with `--cold-manifest true`.

## Reference run

Recorded on 5 September 2026 on an idle AMD Ryzen 7 2700 (16 threads) running
Linux 7.2.2, Bun 1.3.11, Node 26.7.0, Next 16.2.10, TanStack Start 1.168.49
with TanStack Router 1.170.32, React 19.2.7, and Playwright 1.61.1 driving
Chromium 149.0.7827.55. Both arms ran with identical settings, in this order:

```bash
bun run --cwd benchmarks/nextjs-browser-bench bench -- --iterations 15 --warmup 2
bun run --cwd benchmarks/tanstack-start-browser-bench bench -- --iterations 15 --warmup 2
bun run --cwd benchmarks/nextjs-browser-bench bench -- --iterations 15 --warmup 2 --profile mobile --init-latency-ms 200
bun run --cwd benchmarks/tanstack-start-browser-bench bench -- --iterations 15 --warmup 2 --profile mobile --init-latency-ms 200
bun run bench:frameworks
```

A stale server from a debugging session held port 4312 during the first
attempt, so the two Next passes were rerun about ten minutes after the Start
passes; nothing else ran on the machine in between. Scenario names with a
`:profile-mobile:latency-200ms` suffix are the 4x CPU throttle, Fast-4G
network, 200 ms fixture-latency pass. `jsBytes` counts every `.js` resource
including modulepreloaded modules; see the fix in
`benchmarks/shared/src/browser.ts` for why the earlier `initiatorType`
filter under-counted Start by an order of magnitude.

### Reading the numbers

**Desktop profile, no added latency.** The two adapters land within run noise
of each other on the metric that matters, time to a visible banner: Start is
between 3% faster (`manifest-ssr`, 144 vs 149 ms) and 8% slower (`client`,
147 vs 136 ms), with p95 ranges that overlap on every shared arm. Banner
first paint on the SSR arms is 60 ms on both. The accept click costs 53 to 71
ms on both sides. Start ships 17% less JavaScript in total (206 vs 249 kB),
but that is the framework floor (`baseline`: 114 vs 151 kB); the consent
code itself adds the same amount on both (92 vs 98 kB).

**Server side.** Start's static pages answer about 5 ms later than
`next start` (`baseline` TTFB 8.7 vs 4.3 ms), which is the srvx plus Start
router floor on this build. On `manifest-ssr` that reverses: Start reads the
manifest cache in-process and answers in 11.6 ms where Next spends 16.9 ms
fetching its own `/api/c15t/manifest` route over HTTP first. On `ssr` both
pay the direct init round trip on every request and the floor gap returns
(20.9 vs 15.9 ms). With `--init-latency-ms 200` the `ssr` arms show the cost
of that design on both sides (TTFB 221 ms) while every manifest arm stays
under 20 ms, because the manifest is cached after the first fill.

**Proxy hop.** `manifest-ssr-proxy` versus `manifest-ssr` prices
`createConsentServerRoute({ proxy: true })` on the accept click: +6 ms on
desktop (71.1 vs 64.9 ms) and +2 ms under the mobile profile (108.0 vs
105.7 ms). The browser makes the same single request either way; the extra
work is a server-to-server fetch on the same host, so the throttled network
never sees it. Everything else about the arm is identical, which is what the
tables show.

**Mobile profile.** This is where the adapters separate. With 170 ms of
network latency Start's banner becomes visible 240 to 320 ms after Next's on
every consent arm (`client` 1411 vs 1094 ms, `manifest-ssr` 1171 vs 928 ms,
`ssr` 1218 vs 978 ms), and even `baseline` trails by 124 ms (848 vs 723 ms).
The cause is the shape of the script waterfall, not the amount of script.
Next's HTML lists all of its chunks as `<script async>` in the head, so they
download in one wave and the init fetch starts at about 814 ms. Start's HTML
modulepreloads the entry graph (one wave, 183 to 643 ms), then the route's
code-split chunk and Vite's preload helper (603 to 783 ms), then the consent
provider's chunks (`policy-actions`, `state`, `context`,
`use-component-config`; 883 to 1077 ms), then `theme` (1170 ms); the init
fetch only starts at about 1131 ms. Each wave is a round trip, and two extra
round trips at 170 ms is the gap. The same shape makes `baseline` slower:
Start's per-route code splitting loads the route module after the entry.
Start does less main-thread work once the code arrives (`longTaskTotalMs`
62 vs 122 ms on every mobile arm), which is why the desktop numbers tie.

**Where the comparison is not fair.**

- Different servers: `next start` versus srvx hosting a Vite build. The TTFB
  floor above is a property of this hosting choice, not of the adapter.
- `client` and `manifest-client` use `ssr: false` on Start, so the first HTML
  carries no page shell, while Next still server-renders the shell of its
  client component. The consent path is client-only in both.
- Start's `ssr` arm needs a hand-written loader to match Next's per-request
  `/init` fetch; the package helper would have gone through the manifest
  cache and looked like `manifest-ssr`.
- Next's `manifest-ssr` and `rsc-ssr` boundaries run in offline mode, so
  their accept click never posts to the fixture; Start's `manifest-ssr`
  posts. Compare their `interactionLatencyMs` with that in mind.
- `rsc-ssr` has no Start counterpart. It is Next's fastest arm under the
  mobile profile (912 ms to a visible banner) because only two islands
  hydrate; Start has no server components, so this is reported as Next-only
  rather than approximated.
- Every hosted SSR arm shows `initRequestsAfterLoad` of 1 on both frameworks
  because the React provider dispatches init eagerly on the client even with
  an authoritative prefetch. The `count-eq 0` budget copied from the Next
  runner fails on those arms on both sides; it is a provider property, not
  an adapter difference.
- Manifest caches were warm for every measured iteration (two warmup
  iterations per arm). `--cold-manifest true` measures the first fill.

### Root-mounted provider

Recorded on 5 September 2026 on the same machine and toolchain as the
reference run, in one session, in this order:

```bash
bun run --cwd benchmarks/nextjs-browser-bench bench -- --scenario manifest-ssr --iterations 15 --warmup 2
bun run --cwd benchmarks/tanstack-start-browser-bench bench -- --scenario manifest-ssr --iterations 15 --warmup 2
bun run --cwd benchmarks/tanstack-start-browser-bench bench -- --root-provider --iterations 15 --warmup 2
# the same three with --profile mobile --init-latency-ms 200
bun run bench:frameworks
```

**Hypothesis.** The bench mounts the consent provider inside each scenario
route, which Start code-splits, so the provider's chunks are fetched after
the route component chunk executes. The documented app pattern mounts
`ConsentBoundary` in `__root.tsx`, which Start does not code-split, so in a
real app those chunks should be part of the preloaded entry graph and the
mobile gap should shrink.

**Result: refuted.** Root mounting does not get the consent chunks into
the HTML preload list, and under the mobile profile it makes the banner
visible 69 ms later, not earlier. The gap to Next widened from +201 ms to
+270 ms.

#### Preload lists

`<link rel="modulepreload">` hrefs in the served `/manifest-ssr` HTML.
Hashes are from the builds measured below.

Default build (`dist/`, provider mounted in the route):

```text
/assets/index-BgNc1FhE.js
/assets/rolldown-runtime-QTnfLwEv.js
/assets/jsx-runtime-CIxEorsV.js
/assets/loaders-GYqgsAgf.js
/assets/link-F-B3v8vI.js
/assets/router-Dlc683OF.js
/assets/manifest-ssr-BKAMiTBR.js   (route component chunk)
/assets/provider-CP6A0KFU.js
/assets/manifest-ssr--5YaoUS4.js   (route definition chunk)
```

Root-mounted build (`dist-root/`, `C15T_BENCH_ROOT_PROVIDER=1`):

```text
/assets/index-Bv1mi7H7.js
/assets/rolldown-runtime-QTnfLwEv.js
/assets/jsx-runtime-CIxEorsV.js
/assets/loaders-B-JkcSQw.js
/assets/link-F-B3v8vI.js
/assets/router-DOKVkgT0.js
/assets/manifest-ssr-BoaaMnv8.js   (route component chunk)
/assets/provider-D81x4oL8.js
/assets/manifest-ssr-CHyVr-VH.js   (route definition chunk)
/assets/page-shell-hdBAiCOv.js
```

| Chunk | Default build | Root-mounted build |
| --- | --- | --- |
| `policy-actions` (~49 kB) | not preloaded | not preloaded |
| `state` | not preloaded | not preloaded |
| `context` | not preloaded | not preloaded |
| `use-component-config` | not preloaded | not preloaded |
| `theme` | not preloaded | not preloaded |

Why: Start builds the preload list in
`@tanstack/start-plugin-core/src/start-manifest-plugin/manifestBuilder.ts`.
`getChunkPreloads(chunk)` returns the chunk plus `chunk.imports`, one level
deep, for the entry chunk (root route) and for each matched route's chunks;
stylesheets are collected recursively, scripts are not. The same code is on
TanStack's `main` as of this run. In the root-mounted build `__root.tsx`
is bundled into the `router` chunk (the route tree), which the entry
imports directly, and `router` imports `provider`, which imports
`policy-actions`, `state`, `context`, and `use-component-config`. That puts
the provider two levels below the entry and its own imports three levels
down, so none of them make the list. `provider` appears in both lists only
because the route component chunk imports it directly. `theme` is a
dynamic import inside `@c15t/react`'s provider, so no static walk would
ever list it.

#### Metrics

Medians and p95 from this session. Next has no root-mounted counterpart;
its `manifest-ssr` boundary is already in the root layout.

Desktop profile, no added latency:

| Metric | Next `manifest-ssr` | Start `manifest-ssr` | Start `manifest-ssr-root` |
| --- | ---: | ---: | ---: |
| `ttfbMs` | 19.1 / 30.5 ms | 18.8 / 29.4 ms | 14.0 / 26.1 ms |
| `htmlDoneMs` | 55.9 / 63.3 ms | 59.7 / 72.4 ms | 51.4 / 68.8 ms |
| `bannerReadyMs` | 155.8 / 164.9 ms | 155.3 / 166.5 ms | 152.4 / 226.4 ms |
| `bannerVisibleMs` | 155.9 / 164.9 ms | 155.4 / 166.5 ms | 152.4 / 226.5 ms |
| `bannerPaintMs` | 64 / 84 ms | 68 / 80 ms | 60 / 76 ms |
| `firstAppScriptStartMs` | 26.3 / 39.0 ms | 25.0 / 37.2 ms | 19.5 / 33.4 ms |
| `lastAppScriptEndMs` | 183.2 / 192.4 ms | 149.6 / 165.5 ms | 149.8 / 230.2 ms |
| `appScriptCount` | 13 / 13 | 18 / 18 | 20 / 20 |
| `jsBytes` | 249.0 / 249.0 kB | 206.3 / 206.3 kB | 207.5 / 207.5 kB |
| `longTaskTotalMs` | 0 / 0 ms | 0 / 0 ms | 0 / 0 ms |

Mobile profile (4x CPU, 170 ms RTT), `--init-latency-ms 200`:

| Metric | Next `manifest-ssr` | Start `manifest-ssr` | Start `manifest-ssr-root` |
| --- | ---: | ---: | ---: |
| `ttfbMs` | 19.6 / 43.0 ms | 19.7 / 27.2 ms | 20.0 / 25.1 ms |
| `htmlDoneMs` | 398.4 / 429.7 ms | 412.4 / 440.3 ms | 410.9 / 437.1 ms |
| `bannerReadyMs` | 984.2 / 1105.0 ms | 1184.7 / 1248.7 ms | 1253.8 / 1315.5 ms |
| `bannerVisibleMs` | 984.3 / 1105.0 ms | 1185.2 / 1248.7 ms | 1253.8 / 1315.6 ms |
| `bannerPaintMs` | 404 / 424 ms | 412 / 432 ms | 412 / 436 ms |
| `firstAppScriptStartMs` | 186.2 / 210.1 ms | 185.0 / 187.1 ms | 184.4 / 188.3 ms |
| `lastAppScriptEndMs` | 1129.8 / 1249.2 ms | 1357.4 / 1421.2 ms | 1427.3 / 1490.4 ms |
| `appScriptCount` | 12 / 12 | 18 / 18 | 20 / 20 |
| `jsBytes` | 246.2 / 246.2 kB | 206.3 / 206.3 kB | 207.5 / 207.5 kB |
| `longTaskTotalMs` | 142 / 209 ms | 66 / 89 ms | 67 / 73 ms |

#### Waterfall, mobile profile

Resource start and end times (ms after navigation start) for the iteration
whose `bannerVisibleMs` was the median of three, captured with the same
CDP throttle and 200 ms fixture latency after the runs above. Stylesheets
and the entry graph are omitted from the middle rows; they arrive in the
first wave in both builds (index at 426/429 ms, `router` at 595 ms,
`provider` at 642/641 ms).

| Wave | Default build (banner visible 1180 ms) | Root-mounted build (banner visible 1258 ms) |
| --- | --- | --- |
| 1: HTML preloads | 186 to 642: entry graph, route chunks, `provider`, CSS | 184 to 724: the same plus `page-shell` |
| 2: `router`'s second-level imports | 599 to 781: `preload-helper`, `ssr`, `manifest-ssr-proxy` | 599 to 778: `preload-helper`, `server`, `ssr`, `manifest-ssr-proxy` |
| 2b: `provider`'s imports | (not yet requested) | 649 to 955: `policy-actions`, `context`, `use-component-config`, `state` |
| 3 | 888 to 1081: `policy-actions`, `688`, `context`, `state`, `use-component-config` via Vite's preload helper, once the route component resolves | 843 to 1017: `688` (imported by `policy-actions`) |
| after hydration | 1137 `/api/c15t/init`, 1175 to 1353 `theme` | 1197 `/api/c15t/init`, 1254 to 1429 `theme` |

#### Reading it

- **Root mounting moves the consent chunks one wave earlier, and that is
  all.** They are requested when the browser parses the preloaded
  `provider` chunk (649 ms) instead of when Vite's preload helper runs
  (888 ms). But `688`, which `policy-actions` imports, becomes a new third
  wave (843 to 1017), so the static graph completes only 64 ms earlier
  than the default build's (1017 vs 1081 ms).
- **It costs the overlap.** In the default build the entry's static graph
  is complete at about 780 ms and the entry, router, and route tree
  evaluate (about 107 ms at 4x CPU) while wave 3 is in flight. In the
  root-mounted build `provider` and its imports are part of the entry's
  static graph, so nothing runs until 1017 ms and every millisecond of
  evaluation lands after the last byte. Net effect: banner visible 69 ms
  later (1254 vs 1185 ms), `appScriptCount` 20 instead of 18. On the
  desktop profile the two are within noise (152 vs 155 ms).
- **What still loads late.** In both builds the entry cannot run before
  wave 2, the second-level imports of the `router` chunk (the other
  routes' definition chunks and Vite's preload helper), which the HTML
  never preloads. `theme` and the browser init request are fetched after
  hydration and are not on the banner-visible path: the banner is visible
  before either returns.
- **The remaining lever is upstream, not in the adapter.** Next lists
  every chunk as `<script async>` in one wave and shows the banner at
  984 ms. Start's manifest builder would close most of the gap by walking
  `chunk.imports` transitively, the way Vite's own HTML entry injection
  does; the default build would then have everything but `theme` in the
  first wave and could execute at about 640 ms instead of 780. The adapter
  cannot do this itself: chunk file names exist only inside the Vite
  build, and the plugin's `additionalRouteAssets` hook is internal, used
  for the single stylesheet when `cssCodeSplit` is off. An app could patch
  the manifest with its own Vite plugin, but that is app tooling. The
  `theme` dynamic import in `@c15t/react` is a separate, smaller item
  and does not gate banner visibility. Mounting in `__root.tsx` is still
  the right pattern for a real app, one provider for every route, but it
  is not a performance lever on Start 1.168, so the adapter's TSDoc does
  not recommend it on those grounds.

### Tables

Generated by `bun run bench:frameworks`; deltas are `tanstack-start − nextjs`
on the median, negative is faster or smaller.

### Shared scenarios

#### baseline


| Metric | nextjs median | nextjs p95 | tanstack-start median | tanstack-start p95 | Δ median tanstack-start vs nextjs |
| --- | ---: | ---: | ---: | ---: | ---: |
| `ttfbMs` | 4.30 ms | 6.40 ms | 8.70 ms | 13.70 ms | +4.40 ms (+102.3%) |
| `htmlDoneMs` | 19.60 ms | 23.10 ms | 23.00 ms | 42.60 ms | +3.40 ms (+17.4%) |
| `bannerReadyMs` | 112.70 ms | 140.80 ms | 112.50 ms | 142.90 ms | -0.20 ms (-0.2%) |
| `bannerVisibleMs` | 112.70 ms | 140.80 ms | 112.50 ms | 142.90 ms | -0.20 ms (-0.2%) |
| `bannerPaintMs` | n/a | n/a | n/a | n/a | n/a |
| `jsBytes` | 147.46 kB | 147.46 kB | 111.25 kB | 111.25 kB | -36.21 kB (-24.6%) |
| `interactionLatencyMs` | 58.39 ms | 73.88 ms | 56.32 ms | 65.55 ms | -2.07 ms (-3.5%) |
| `initRequestsAfterLoad` | 0 | 0 | 0 | 0 | 0 |
| `manifestRequestsAfterLoad` | 0 | 0 | 0 | 0 | 0 |
| `cls` | 0.00 ratio | 0.00 ratio | 0.00 ratio | 0.00 ratio | 0.00 ratio |
| `longTaskTotalMs` | 0.00 ms | 0.00 ms | 0.00 ms | 0.00 ms | 0.00 ms |
| `bannerInFirstHtml` | no |  | no |  |  |

#### client


| Metric | nextjs median | nextjs p95 | tanstack-start median | tanstack-start p95 | Δ median tanstack-start vs nextjs |
| --- | ---: | ---: | ---: | ---: | ---: |
| `ttfbMs` | 3.90 ms | 6.20 ms | 9.00 ms | 13.10 ms | +5.10 ms (+130.8%) |
| `htmlDoneMs` | 24.60 ms | 32.10 ms | 34.30 ms | 45.20 ms | +9.70 ms (+39.4%) |
| `bannerReadyMs` | 136.20 ms | 160.60 ms | 146.50 ms | 164.30 ms | +10.30 ms (+7.6%) |
| `bannerVisibleMs` | 136.20 ms | 160.70 ms | 146.70 ms | 164.30 ms | +10.50 ms (+7.7%) |
| `bannerPaintMs` | 144.00 ms | 168.00 ms | 156.00 ms | 176.00 ms | +12.00 ms (+8.3%) |
| `jsBytes` | 243.17 kB | 243.17 kB | 201.40 kB | 201.40 kB | -41.77 kB (-17.2%) |
| `interactionLatencyMs` | 66.63 ms | 73.29 ms | 68.36 ms | 78.50 ms | +1.74 ms (+2.6%) |
| `initRequestsAfterLoad` | 1 | 1 | 1 | 1 | 0 (0.0%) |
| `manifestRequestsAfterLoad` | 0 | 0 | 0 | 0 | 0 |
| `cls` | 0.00 ratio | 0.00 ratio | 0.00 ratio | 0.00 ratio | 0.00 ratio |
| `longTaskTotalMs` | 0.00 ms | 0.00 ms | 0.00 ms | 0.00 ms | 0.00 ms |
| `bannerInFirstHtml` | no |  | no |  |  |

#### manifest-client


| Metric | nextjs median | nextjs p95 | tanstack-start median | tanstack-start p95 | Δ median tanstack-start vs nextjs |
| --- | ---: | ---: | ---: | ---: | ---: |
| `ttfbMs` | 3.50 ms | 6.20 ms | 6.10 ms | 13.50 ms | +2.60 ms (+74.3%) |
| `htmlDoneMs` | 22.50 ms | 30.00 ms | 32.20 ms | 46.50 ms | +9.70 ms (+43.1%) |
| `bannerReadyMs` | 139.90 ms | 148.00 ms | 146.00 ms | 181.40 ms | +6.10 ms (+4.4%) |
| `bannerVisibleMs` | 140.10 ms | 148.00 ms | 146.10 ms | 181.50 ms | +6.00 ms (+4.3%) |
| `bannerPaintMs` | 148.00 ms | 156.00 ms | 156.00 ms | 192.00 ms | +8.00 ms (+5.4%) |
| `jsBytes` | 243.17 kB | 243.17 kB | 201.42 kB | 201.42 kB | -41.75 kB (-17.2%) |
| `interactionLatencyMs` | 60.41 ms | 84.06 ms | 62.89 ms | 78.37 ms | +2.48 ms (+4.1%) |
| `initRequestsAfterLoad` | 0 | 0 | 0 | 0 | 0 |
| `manifestRequestsAfterLoad` | 1 | 1 | 1 | 1 | 0 (0.0%) |
| `cls` | 0.00 ratio | 0.00 ratio | 0.00 ratio | 0.00 ratio | 0.00 ratio |
| `longTaskTotalMs` | 0.00 ms | 0.00 ms | 0.00 ms | 0.00 ms | 0.00 ms |
| `bannerInFirstHtml` | no |  | no |  |  |

#### ssr


| Metric | nextjs median | nextjs p95 | tanstack-start median | tanstack-start p95 | Δ median tanstack-start vs nextjs |
| --- | ---: | ---: | ---: | ---: | ---: |
| `ttfbMs` | 15.90 ms | 23.90 ms | 20.90 ms | 26.70 ms | +5.00 ms (+31.4%) |
| `htmlDoneMs` | 46.60 ms | 62.70 ms | 59.00 ms | 71.40 ms | +12.40 ms (+26.6%) |
| `bannerReadyMs` | 148.80 ms | 167.40 ms | 159.10 ms | 178.40 ms | +10.30 ms (+6.9%) |
| `bannerVisibleMs` | 148.80 ms | 167.40 ms | 159.20 ms | 178.50 ms | +10.40 ms (+7.0%) |
| `bannerPaintMs` | 60.00 ms | 72.00 ms | 64.00 ms | 80.00 ms | +4.00 ms (+6.7%) |
| `jsBytes` | 243.17 kB | 243.17 kB | 201.46 kB | 201.46 kB | -41.71 kB (-17.1%) |
| `interactionLatencyMs` | 65.82 ms | 75.69 ms | 52.94 ms | 82.05 ms | -12.88 ms (-19.6%) |
| `initRequestsAfterLoad` | 1 | 1 | 1 | 1 | 0 (0.0%) |
| `manifestRequestsAfterLoad` | 0 | 0 | 0 | 0 | 0 |
| `cls` | 0.00 ratio | 0.00 ratio | 0.00 ratio | 0.00 ratio | 0.00 ratio |
| `longTaskTotalMs` | 0.00 ms | 0.00 ms | 0.00 ms | 0.00 ms | 0.00 ms |
| `bannerInFirstHtml` | yes |  | yes |  |  |

#### manifest-ssr


| Metric | nextjs median | nextjs p95 | tanstack-start median | tanstack-start p95 | Δ median tanstack-start vs nextjs |
| --- | ---: | ---: | ---: | ---: | ---: |
| `ttfbMs` | 16.90 ms | 22.60 ms | 11.60 ms | 20.80 ms | -5.30 ms (-31.4%) |
| `htmlDoneMs` | 46.60 ms | 61.80 ms | 45.20 ms | 65.00 ms | -1.40 ms (-3.0%) |
| `bannerReadyMs` | 149.20 ms | 164.40 ms | 144.30 ms | 168.40 ms | -4.90 ms (-3.3%) |
| `bannerVisibleMs` | 149.20 ms | 164.40 ms | 144.30 ms | 168.50 ms | -4.90 ms (-3.3%) |
| `bannerPaintMs` | 60.00 ms | 72.00 ms | 60.00 ms | 76.00 ms | 0.00 ms (0.0%) |
| `jsBytes` | 243.17 kB | 243.17 kB | 201.48 kB | 201.48 kB | -41.69 kB (-17.1%) |
| `interactionLatencyMs` | 59.83 ms | 70.58 ms | 64.87 ms | 75.97 ms | +5.04 ms (+8.4%) |
| `initRequestsAfterLoad` | 0 | 0 | 1 | 1 | +1 |
| `manifestRequestsAfterLoad` | 0 | 0 | 0 | 0 | 0 |
| `cls` | 0.00 ratio | 0.00 ratio | 0.00 ratio | 0.00 ratio | 0.00 ratio |
| `longTaskTotalMs` | 0.00 ms | 0.00 ms | 0.00 ms | 0.00 ms | 0.00 ms |
| `bannerInFirstHtml` | yes |  | yes |  |  |

#### repeat-visitor


| Metric | nextjs median | nextjs p95 | tanstack-start median | tanstack-start p95 | Δ median tanstack-start vs nextjs |
| --- | ---: | ---: | ---: | ---: | ---: |
| `ttfbMs` | 3.60 ms | 4.90 ms | 7.30 ms | 10.80 ms | +3.70 ms (+102.8%) |
| `htmlDoneMs` | 23.70 ms | 33.30 ms | 33.10 ms | 42.70 ms | +9.40 ms (+39.7%) |
| `bannerReadyMs` | 141.90 ms | 156.70 ms | 143.50 ms | 160.20 ms | +1.60 ms (+1.1%) |
| `bannerVisibleMs` | 141.90 ms | 156.80 ms | 143.60 ms | 160.20 ms | +1.70 ms (+1.2%) |
| `bannerPaintMs` | 148.00 ms | 168.00 ms | 156.00 ms | 172.00 ms | +8.00 ms (+5.4%) |
| `jsBytes` | 243.17 kB | 243.17 kB | 201.40 kB | 201.40 kB | -41.77 kB (-17.2%) |
| `interactionLatencyMs` | 73.52 ms | 91.27 ms | 67.55 ms | 81.72 ms | -5.97 ms (-8.1%) |
| `initRequestsAfterLoad` | 1 | 1 | 1 | 1 | 0 (0.0%) |
| `manifestRequestsAfterLoad` | 0 | 0 | 0 | 0 | 0 |
| `cls` | 0.00 ratio | 0.00 ratio | 0.00 ratio | 0.00 ratio | 0.00 ratio |
| `longTaskTotalMs` | 0.00 ms | 0.00 ms | 0.00 ms | 0.00 ms | 0.00 ms |
| `bannerInFirstHtml` | no |  | no |  |  |

#### baseline:profile-mobile:latency-200ms


| Metric | nextjs median | nextjs p95 | tanstack-start median | tanstack-start p95 | Δ median tanstack-start vs nextjs |
| --- | ---: | ---: | ---: | ---: | ---: |
| `ttfbMs` | 4.80 ms | 7.10 ms | 12.50 ms | 14.90 ms | +7.70 ms (+160.4%) |
| `htmlDoneMs` | 214.80 ms | 217.70 ms | 219.00 ms | 225.70 ms | +4.20 ms (+2.0%) |
| `bannerReadyMs` | 723.20 ms | 741.70 ms | 847.60 ms | 864.90 ms | +124.40 ms (+17.2%) |
| `bannerVisibleMs` | 723.20 ms | 741.70 ms | 847.60 ms | 864.90 ms | +124.40 ms (+17.2%) |
| `bannerPaintMs` | n/a | n/a | n/a | n/a | n/a |
| `jsBytes` | 147.46 kB | 147.46 kB | 111.25 kB | 111.25 kB | -36.21 kB (-24.6%) |
| `interactionLatencyMs` | 84.88 ms | 90.55 ms | 86.05 ms | 89.85 ms | +1.18 ms (+1.4%) |
| `initRequestsAfterLoad` | 0 | 0 | 0 | 0 | 0 |
| `manifestRequestsAfterLoad` | 0 | 0 | 0 | 0 | 0 |
| `cls` | 0.00 ratio | 0.00 ratio | 0.00 ratio | 0.00 ratio | 0.00 ratio |
| `longTaskTotalMs` | 120.00 ms | 144.00 ms | 63.00 ms | 74.00 ms | -57.00 ms (-47.5%) |
| `bannerInFirstHtml` | no |  | no |  |  |

#### client:profile-mobile:latency-200ms


| Metric | nextjs median | nextjs p95 | tanstack-start median | tanstack-start p95 | Δ median tanstack-start vs nextjs |
| --- | ---: | ---: | ---: | ---: | ---: |
| `ttfbMs` | 3.90 ms | 5.30 ms | 9.60 ms | 11.60 ms | +5.70 ms (+146.2%) |
| `htmlDoneMs` | 386.20 ms | 390.30 ms | 384.20 ms | 388.50 ms | -2.00 ms (-0.5%) |
| `bannerReadyMs` | 1093.90 ms | 1110.10 ms | 1410.60 ms | 1419.00 ms | +316.70 ms (+28.9%) |
| `bannerVisibleMs` | 1094.40 ms | 1110.20 ms | 1410.70 ms | 1419.70 ms | +316.30 ms (+28.9%) |
| `bannerPaintMs` | 1108.00 ms | 1124.00 ms | 1424.00 ms | 1432.00 ms | +316.00 ms (+28.5%) |
| `jsBytes` | 240.43 kB | 240.43 kB | 201.40 kB | 201.40 kB | -39.03 kB (-16.2%) |
| `interactionLatencyMs` | 110.08 ms | 115.98 ms | 109.43 ms | 120.96 ms | -0.65 ms (-0.6%) |
| `initRequestsAfterLoad` | 1 | 1 | 1 | 1 | 0 (0.0%) |
| `manifestRequestsAfterLoad` | 0 | 0 | 0 | 0 | 0 |
| `cls` | 0.00 ratio | 0.00 ratio | 0.00 ratio | 0.00 ratio | 0.00 ratio |
| `longTaskTotalMs` | 122.00 ms | 143.00 ms | 62.00 ms | 68.00 ms | -60.00 ms (-49.2%) |
| `bannerInFirstHtml` | no |  | no |  |  |

#### manifest-client:profile-mobile:latency-200ms


| Metric | nextjs median | nextjs p95 | tanstack-start median | tanstack-start p95 | Δ median tanstack-start vs nextjs |
| --- | ---: | ---: | ---: | ---: | ---: |
| `ttfbMs` | 4.40 ms | 6.40 ms | 9.00 ms | 12.50 ms | +4.60 ms (+104.5%) |
| `htmlDoneMs` | 386.30 ms | 409.10 ms | 383.70 ms | 406.80 ms | -2.60 ms (-0.7%) |
| `bannerReadyMs` | 1061.60 ms | 1082.70 ms | 1383.60 ms | 1402.20 ms | +322.00 ms (+30.3%) |
| `bannerVisibleMs` | 1062.00 ms | 1083.00 ms | 1383.60 ms | 1402.30 ms | +321.60 ms (+30.3%) |
| `bannerPaintMs` | 1076.00 ms | 1096.00 ms | 1396.00 ms | 1412.00 ms | +320.00 ms (+29.7%) |
| `jsBytes` | 240.43 kB | 240.43 kB | 201.42 kB | 201.42 kB | -39.01 kB (-16.2%) |
| `interactionLatencyMs` | 106.56 ms | 138.36 ms | 103.94 ms | 124.05 ms | -2.62 ms (-2.5%) |
| `initRequestsAfterLoad` | 0 | 0 | 0 | 0 | 0 |
| `manifestRequestsAfterLoad` | 1 | 1 | 1 | 1 | 0 (0.0%) |
| `cls` | 0.00 ratio | 0.00 ratio | 0.00 ratio | 0.00 ratio | 0.00 ratio |
| `longTaskTotalMs` | 122.00 ms | 138.00 ms | 63.00 ms | 69.00 ms | -59.00 ms (-48.4%) |
| `bannerInFirstHtml` | no |  | no |  |  |

#### ssr:profile-mobile:latency-200ms


| Metric | nextjs median | nextjs p95 | tanstack-start median | tanstack-start p95 | Δ median tanstack-start vs nextjs |
| --- | ---: | ---: | ---: | ---: | ---: |
| `ttfbMs` | 220.90 ms | 231.00 ms | 221.30 ms | 228.90 ms | +0.40 ms (+0.2%) |
| `htmlDoneMs` | 446.30 ms | 458.00 ms | 454.30 ms | 462.10 ms | +8.00 ms (+1.8%) |
| `bannerReadyMs` | 978.20 ms | 991.30 ms | 1217.70 ms | 1228.70 ms | +239.50 ms (+24.5%) |
| `bannerVisibleMs` | 978.30 ms | 991.30 ms | 1217.80 ms | 1229.10 ms | +239.50 ms (+24.5%) |
| `bannerPaintMs` | 452.00 ms | 460.00 ms | 456.00 ms | 464.00 ms | +4.00 ms (+0.9%) |
| `jsBytes` | 240.43 kB | 240.43 kB | 201.46 kB | 201.46 kB | -38.97 kB (-16.2%) |
| `interactionLatencyMs` | 115.96 ms | 128.53 ms | 105.73 ms | 111.14 ms | -10.23 ms (-8.8%) |
| `initRequestsAfterLoad` | 1 | 1 | 1 | 1 | 0 (0.0%) |
| `manifestRequestsAfterLoad` | 0 | 0 | 0 | 0 | 0 |
| `cls` | 0.00 ratio | 0.00 ratio | 0.00 ratio | 0.00 ratio | 0.00 ratio |
| `longTaskTotalMs` | 123.00 ms | 128.00 ms | 62.00 ms | 76.00 ms | -61.00 ms (-49.6%) |
| `bannerInFirstHtml` | yes |  | yes |  |  |

#### manifest-ssr:profile-mobile:latency-200ms


| Metric | nextjs median | nextjs p95 | tanstack-start median | tanstack-start p95 | Δ median tanstack-start vs nextjs |
| --- | ---: | ---: | ---: | ---: | ---: |
| `ttfbMs` | 16.90 ms | 22.00 ms | 16.20 ms | 22.30 ms | -0.70 ms (-4.1%) |
| `htmlDoneMs` | 395.80 ms | 405.90 ms | 407.50 ms | 413.00 ms | +11.70 ms (+3.0%) |
| `bannerReadyMs` | 928.20 ms | 943.20 ms | 1170.50 ms | 1199.50 ms | +242.30 ms (+26.1%) |
| `bannerVisibleMs` | 928.30 ms | 943.30 ms | 1170.50 ms | 1199.50 ms | +242.20 ms (+26.1%) |
| `bannerPaintMs` | 404.00 ms | 408.00 ms | 412.00 ms | 416.00 ms | +8.00 ms (+2.0%) |
| `jsBytes` | 240.43 kB | 240.43 kB | 201.48 kB | 201.48 kB | -38.95 kB (-16.2%) |
| `interactionLatencyMs` | 116.89 ms | 131.57 ms | 105.72 ms | 108.57 ms | -11.16 ms (-9.6%) |
| `initRequestsAfterLoad` | 0 | 0 | 1 | 1 | +1 |
| `manifestRequestsAfterLoad` | 0 | 0 | 0 | 0 | 0 |
| `cls` | 0.00 ratio | 0.00 ratio | 0.00 ratio | 0.00 ratio | 0.00 ratio |
| `longTaskTotalMs` | 121.00 ms | 139.00 ms | 62.00 ms | 84.00 ms | -59.00 ms (-48.8%) |
| `bannerInFirstHtml` | yes |  | yes |  |  |

#### repeat-visitor:profile-mobile:latency-200ms


| Metric | nextjs median | nextjs p95 | tanstack-start median | tanstack-start p95 | Δ median tanstack-start vs nextjs |
| --- | ---: | ---: | ---: | ---: | ---: |
| `ttfbMs` | 4.00 ms | 5.30 ms | 10.10 ms | 13.30 ms | +6.10 ms (+152.5%) |
| `htmlDoneMs` | 385.20 ms | 406.60 ms | 383.20 ms | 387.20 ms | -2.00 ms (-0.5%) |
| `bannerReadyMs` | 1092.10 ms | 1133.00 ms | 1416.30 ms | 1445.00 ms | +324.20 ms (+29.7%) |
| `bannerVisibleMs` | 1092.60 ms | 1133.10 ms | 1416.40 ms | 1445.70 ms | +323.80 ms (+29.6%) |
| `bannerPaintMs` | 1104.00 ms | 1144.00 ms | 1428.00 ms | 1456.00 ms | +324.00 ms (+29.4%) |
| `jsBytes` | 240.43 kB | 240.43 kB | 201.40 kB | 201.40 kB | -39.03 kB (-16.2%) |
| `interactionLatencyMs` | 103.46 ms | 113.65 ms | 106.37 ms | 113.19 ms | +2.90 ms (+2.8%) |
| `initRequestsAfterLoad` | 1 | 1 | 1 | 1 | 0 (0.0%) |
| `manifestRequestsAfterLoad` | 0 | 0 | 0 | 0 | 0 |
| `cls` | 0.00 ratio | 0.00 ratio | 0.00 ratio | 0.00 ratio | 0.00 ratio |
| `longTaskTotalMs` | 124.00 ms | 142.00 ms | 65.00 ms | 70.00 ms | -59.00 ms (-47.6%) |
| `bannerInFirstHtml` | no |  | no |  |  |

### Only in nextjs

#### rsc-ssr


| Metric | median | p95 |
| --- | ---: | ---: |
| `ttfbMs` | 15.30 ms | 17.80 ms |
| `htmlDoneMs` | 41.10 ms | 53.20 ms |
| `bannerReadyMs` | 133.40 ms | 154.50 ms |
| `bannerVisibleMs` | 133.40 ms | 154.50 ms |
| `bannerPaintMs` | 56.00 ms | 60.00 ms |
| `jsBytes` | 243.40 kB | 243.40 kB |
| `interactionLatencyMs` | 56.81 ms | 70.08 ms |
| `initRequestsAfterLoad` | 0 | 0 |
| `manifestRequestsAfterLoad` | 0 | 0 |
| `cls` | 0.00 ratio | 0.00 ratio |
| `longTaskTotalMs` | 0.00 ms | 0.00 ms |
| `bannerInFirstHtml` | yes | |

#### rsc-ssr:profile-mobile:latency-200ms


| Metric | median | p95 |
| --- | ---: | ---: |
| `ttfbMs` | 12.50 ms | 19.20 ms |
| `htmlDoneMs` | 391.10 ms | 395.80 ms |
| `bannerReadyMs` | 911.60 ms | 929.90 ms |
| `bannerVisibleMs` | 911.60 ms | 930.00 ms |
| `bannerPaintMs` | 396.00 ms | 400.00 ms |
| `jsBytes` | 240.66 kB | 240.66 kB |
| `interactionLatencyMs` | 109.36 ms | 121.16 ms |
| `initRequestsAfterLoad` | 0 | 0 |
| `manifestRequestsAfterLoad` | 0 | 0 |
| `cls` | 0.00 ratio | 0.00 ratio |
| `longTaskTotalMs` | 122.00 ms | 153.00 ms |
| `bannerInFirstHtml` | yes | |

### Only in tanstack-start

#### manifest-ssr-proxy


| Metric | median | p95 |
| --- | ---: | ---: |
| `ttfbMs` | 9.70 ms | 18.10 ms |
| `htmlDoneMs` | 37.10 ms | 68.90 ms |
| `bannerReadyMs` | 149.70 ms | 169.70 ms |
| `bannerVisibleMs` | 149.80 ms | 169.70 ms |
| `bannerPaintMs` | 60.00 ms | 72.00 ms |
| `jsBytes` | 201.56 kB | 201.56 kB |
| `interactionLatencyMs` | 71.12 ms | 78.75 ms |
| `initRequestsAfterLoad` | 1 | 1 |
| `manifestRequestsAfterLoad` | 0 | 0 |
| `cls` | 0.00 ratio | 0.00 ratio |
| `longTaskTotalMs` | 0.00 ms | 0.00 ms |
| `bannerInFirstHtml` | yes | |

#### manifest-ssr-proxy:profile-mobile:latency-200ms


| Metric | median | p95 |
| --- | ---: | ---: |
| `ttfbMs` | 17.20 ms | 21.80 ms |
| `htmlDoneMs` | 407.80 ms | 414.70 ms |
| `bannerReadyMs` | 1170.80 ms | 1199.20 ms |
| `bannerVisibleMs` | 1170.80 ms | 1199.20 ms |
| `bannerPaintMs` | 412.00 ms | 416.00 ms |
| `jsBytes` | 201.56 kB | 201.56 kB |
| `interactionLatencyMs` | 108.00 ms | 111.81 ms |
| `initRequestsAfterLoad` | 1 | 1 |
| `manifestRequestsAfterLoad` | 0 | 0 |
| `cls` | 0.00 ratio | 0.00 ratio |
| `longTaskTotalMs` | 62.00 ms | 120.00 ms |
| `bannerInFirstHtml` | yes | |

