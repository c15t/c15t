# Performance Benchmarks

This folder contains performance measurement tools for c15t and @c15t/react.

## Structure

```
benchmarks/
├── README.md           # This file
├── package.json        # Shared dependencies (mitata)
├── BASELINE.md         # Recorded baseline measurements
├── bundle-test-app/    # Next.js app for bundle analysis
└── micro/              # mitata microbenchmarks
```

## Bundle Analysis

Analyze how c15t packages tree-shake when consumed by a Next.js app.

### Automated Analysis (CI-friendly)

```bash
cd benchmarks/bundle-test-app

# Markdown report (human-readable)
bun run build && bun run analyze:md

# JSON output (machine-readable, for CI)
bun run build && bun run analyze:json > bundle-sizes.json

# One command for CI
bun run analyze:ci
```

### Interactive Treemap

For detailed visual analysis:

```bash
bun run analyze  # Opens interactive treemap in browser
```

### Import Scenarios

The bundle test app includes multiple pages testing different import patterns:

- `/full` - All components (CookieBanner + ConsentManagerDialog)
- `/headless` - Headless mode (custom UI)
- `/banner-only` - Just the CookieBanner
- `/core-only` - Vanilla JS core without React

## Microbenchmarks

Runtime performance benchmarks using mitata.

```bash
# Run all microbenchmarks
bun run benchmarks/micro/*.bench.ts

# Run specific benchmark
bun run benchmarks/micro/store.bench.ts
```

### Available Benchmarks

| File | What It Measures |
|------|------------------|
| `store.bench.ts` | Store creation, getState(), saveConsents() |
| `has-condition.bench.ts` | Condition logic: single, AND, OR, NOT, nested |
| `translations.bench.ts` | Translation merging and config preparation |
| `cookie.bench.ts` | Cookie serialization pipeline |
| `script-loader.bench.ts` | Script loader operations |

## Recording Baseline

After running benchmarks, update `BASELINE.md` with the results for comparison against future versions.
