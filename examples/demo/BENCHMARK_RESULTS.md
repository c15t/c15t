# Banner Benchmark Results (examples/demo)

## 2026-03-11 (production mode)

Command:

```bash
bun run benchmark:banner:prod
```

Measured metric:
- `bannerVisibleMs` from `window.__c15tBench` (time to banner visibility)
- 5 iterations per route

### Before rewrite (`backendURL = "https://inth-status-europe-pigeon.c15t.ai"`)

| Route | Median (ms) | Avg (ms) | p95 (ms) |
| --- | ---: | ---: | ---: |
| `client` | 362.2 | 369.4 | 490.8 |
| `ssr` | 87.4 | 116.9 | 229.3 |
| `prefetch` | 157.2 | 154.2 | 169.7 |

### After rewrite (`backendURL = "/api/pigeon"` → Next rewrite to pigeon backend)

| Route | Median (ms) | Avg (ms) | p95 (ms) |
| --- | ---: | ---: | ---: |
| `client` | 226.3 | 231.5 | 302.4 |
| `ssr` | 153.7 | 158.4 | 203.6 |
| `prefetch` | 148.3 | 155.0 | 177.9 |

### Delta (after vs before)

| Route | Median Delta | Relative |
| --- | ---: | ---: |
| `client` | -135.9ms | -37.5% |
| `ssr` | +66.3ms | +75.9% |
| `prefetch` | -8.9ms | -5.7% |

### Change list

1. Added rewrite in `next.config.ts`:
   - `/api/pigeon/:path*` → `https://inth-status-europe-pigeon.c15t.ai/:path*`
2. Switched benchmark backend constant to same-origin path:
   - `BENCHMARK_BACKEND_URL = "/api/pigeon"`
3. Removed cross-origin preconnect from benchmark layout (no longer needed for same-origin API calls)
4. Updated benchmark runner request matcher to observe `/api/pigeon/init`

### Notes

- `ssr` route remains dynamic by design (`fetchInitialData` in layout).
- Request count behavior remained the same:
  - `client`/`prefetch`: 1 request on initial load, no additional request on soft nav, +1 on full reload.
  - `ssr`: 0 browser-observed init requests (server-side fetch path).
- Numbers are environment-sensitive; use multiple runs and medians for decisions.

## 2026-03-11 (production mode, stability check)

Command:

```bash
BENCH_ITERATIONS=10 bun run benchmark:banner:prod
```

Executed 3 full passes (30 iterations per route total).

### Per-run medians (ms)

| Run | client | ssr | prefetch |
| --- | ---: | ---: | ---: |
| 1 | 290.2 | 148.8 | 160.4 |
| 2 | 238.8 | 197.4 | 217.0 |
| 3 | 229.1 | 169.1 | 179.2 |

### Aggregate over 3 runs

| Route | Mean Avg (ms) | Mean Median (ms) | Mean p95 (ms) | Median Range (min-max) |
| --- | ---: | ---: | ---: | --- |
| `client` | 269.7 | 252.7 | 362.1 | 229.1-290.2 |
| `ssr` | 176.5 | 171.8 | 257.4 | 148.8-197.4 |
| `prefetch` | 190.0 | 185.5 | 264.0 | 160.4-217.0 |

### Interpretation

- SSR was faster than client in all 3 runs.
- Prefetch was also faster than client in all 3 runs.
- SSR vs prefetch swapped order by run (both are in the same performance band with normal variance).

## 2026-03-11 (DOM-visible metric, post-animation)

Command:

```bash
BENCH_ITERATIONS=10 bun run benchmark:banner:prod
```

Notes:
- Metric changed to mark visibility only when:
  - `consent-banner-root` and `consent-banner-accept-button` are visible in DOM, and
  - running animations on those elements have completed.
- This captures "accept button fully visible on page" timing.

### Per-run medians (ms)

| Run | client | ssr | prefetch |
| --- | ---: | ---: | ---: |
| 1 | 424.6 | 375.7 | 436.3 |
| 2 | 427.6 | 360.0 | 380.3 |
| 3 | 426.3 | 385.8 | 387.8 |

### Aggregate over 3 runs

| Route | Mean Median (ms) | Mean Avg (ms) | Mean p95 (ms) | Median Range (min-max) |
| --- | ---: | ---: | ---: | --- |
| `client` | 426.2 | 432.0 | 502.0 | 424.6-427.6 |
| `ssr` | 373.8 | 377.2 | 425.9 | 360.0-385.8 |
| `prefetch` | 401.5 | 413.7 | 512.8 | 380.3-436.3 |

### Interpretation

- With post-animation visibility timing, differences shrink because render/animation adds a near-constant floor (~225-230ms from fetched to visible).
- SSR remains consistently faster than client.
- Prefetch is sometimes faster than client, but less stable in these runs.

## 2026-03-11 (production mode, SSR direct backend URL)

Command:

```bash
bun run benchmark:banner:prod
```

Configuration:
- `client` / `prefetch` use rewrite path: `BENCHMARK_BACKEND_URL = "/api/pigeon"`
- `ssr` uses direct backend URL: `BENCHMARK_SSR_BACKEND_URL = "https://inth-status-europe-pigeon.c15t.ai"`

### Result summary (5 iterations)

| Route | Median (ms) | Avg (ms) | p95 (ms) |
| --- | ---: | ---: | ---: |
| `client` | 450.2 | 459.1 | 556.9 |
| `ssr` | 305.8 | 342.2 | 493.6 |
| `prefetch` | 390.7 | 392.7 | 412.7 |

### Notes

- SSR regained the expected advantage once the server-side path stopped proxying through the Next.js rewrite.
- Request counts were unchanged:
  - `client` / `prefetch`: `1 / 1 / 2` (initial load / soft nav / hard reload)
  - `ssr`: `0 / 0 / 0` browser-observed `/init` requests (server fetch path).
