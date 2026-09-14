# manifest-cache-bench

Benchmarks the in-process manifest cache in
`packages/core/src/libs/manifest-cache-runtime.ts` (public entry
`@c15t/core/transports/manifest-cache`, `createManifestCache` /
`fetchCachedManifest`) against a simulated Vercel CDN fronting an Inth
`/manifest` origin. No real sockets: `src/vercel-cdn.ts` is an in-process
`fetch`-compatible simulator with configurable edge/origin RTT, a
`Cache-Control`-driven freshness model (`s-maxage`, `stale-while-revalidate`),
`ETag` revalidation, and three fault modes (`originDown`, `edgeUnreachable`,
`originError`). By default the simulated origin sends `CDN-Cache-Control` as
the c15t backend does, so the CDN forwards `Cache-Control` intact; set
`originSendsCdnCacheControl: false` to model an origin that sends only
`Cache-Control`, which Vercel rewrites to `public, max-age=0, must-revalidate`.

## Run

```sh
bun run --cwd benchmarks/manifest-cache-bench bench        # all scenarios
bun run --cwd benchmarks/manifest-cache-bench bench:quick   # skips edge-unreachable-warm
```

`@c15t/core` must already be built (`bun turbo run build --filter=@c15t/core`)
— this package imports the built `dist`, not `src`, so it measures whatever
is currently installed.

Prints a markdown table to stdout and writes one `BenchmarkResult`-shaped
JSON file per scenario to `BENCH_OUTPUT_DIR` (default
`../../.benchmarks/current/manifest-cache`).

## Scenarios (`src/scenarios.ts`)

Each scenario builds a fresh `createManifestCache()` and a fresh simulated
CDN, drives some number of `fetchCachedManifest` calls, and records
per-request latency and outcome.

| Scenario | What it does | Real wall time |
| --- | --- | --- |
| `cold-instance-burst` | 200 concurrent requests on an empty cache | fast |
| `steady-state-expiry` | 20 rps for a simulated 900s (clock advances 1s per batch, 40 ms real per batch so background work lands); crosses the 300s `s-maxage` twice | ~40s |
| `edge-serving-stale` | Origin down; CDN serves stale at simulated Age 350 then Age 3600 to a fresh app-side cache each; 25 sequential requests per phase | fast |
| `origin-down-warm` | Warm cache, past `s-maxage`, origin down; 20 concurrent requests | fast |
| `edge-unreachable-warm` | Warm cache, past `s-maxage`, edge unreachable; 5 sequential requests. Foreground requests are served from the stale entry at once; only the single background refresh rides out the cache's internal 10s timeout | fast |
| `edge-unreachable-cold` | Empty cache, edge unreachable; 3 sequential requests | ~30s |
| `bare-cache-control-through-cdn` | Origin sends only `Cache-Control`, so the CDN strips `s-maxage` and `stale-while-revalidate` (Vercel's documented behaviour); 20 rps for 60 s | ~3s |

`edge-unreachable-cold` hits `fetchCachedManifest`'s internal 10-second fetch
timeout for real, since that timeout lives inside the cache and there is
nothing to fast-forward. `edge-unreachable-warm` only waits that long when
the cache cannot serve stale, which was the pre-change behaviour; today its
foreground requests return at once. `bench:quick` skips
`edge-unreachable-warm` only.

The simulated clock (`createSimulatedClock` in `src/vercel-cdn.ts`) is
shared between the CDN and the `now` passed to `fetchCachedManifest`, so
both agree on simulated time while only real network round trips (edge and
origin RTT) cost real wall-clock time.

A request counts as a stall when it takes over 10 ms: anything served from
the in-process cache is well under a millisecond, so a stall means the
request waited on the simulated edge or origin.

See `RESULTS.md` for a before/after capture around the stale-while-revalidate
change to the cache.

## Not wired into CI

This harness is not registered in `turbo.json` or any CI workflow. Run it
by hand, or invoke `bun run --cwd benchmarks/manifest-cache-bench bench`
from a script.
