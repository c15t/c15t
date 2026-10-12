# Next.js manifest benchmark

See `capture-notes.json` for the environment and conditions, and the `direct/`
and `manifest/` directories for individual samples. The comparison uses new
visitors and awaited SSR. Returning visitors and the single cold manifest load
are recorded separately.

To reproduce with built workspace dependencies and the benchmark's Playwright
browser installed:

```sh
cd benchmarks/nextjs-browser-bench
bun run build
BENCH_OUTPUT_DIR=/tmp/c15t-direct bunx tsx scripts/run-bench.ts --scenario ssr --iterations 10 --warmup 2 --profile none --init-latency-ms 150
BENCH_OUTPUT_DIR=/tmp/c15t-manifest bunx tsx scripts/run-bench.ts --scenario manifest-ssr --iterations 11 --warmup 0 --cold-manifest true --profile none --init-latency-ms 150
```

The local backend adds 150 ms to `/init` and uncached `/manifest` requests.
These results do not measure Inth latency or streaming SSR. The banner probe
runs after hydration, so it does not measure first paint.
