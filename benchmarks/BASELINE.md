# Performance Baseline - v1.8.3

> Last updated: 2026-01-20
> Environment: Apple M1 Pro, Bun 1.3.6

## Bundle Sizes (Next.js 15.2.4 + React 19.2.0)

Generated with `bun run analyze:md` in `benchmarks/bundle-test-app/`:

| Route | First Load JS (gzip) | c15t Addition |
|-------|----------------------|---------------|
| / (baseline) | 101.93 kB | - |
| /core-only | 114.72 kB | **+12.79 kB** |
| /headless | 116.24 kB | **+14.31 kB** |
| /banner-only | 127.07 kB | **+25.14 kB** |
| /full | 144.82 kB | **+42.89 kB** |

Shared JS (all routes): 98.92 kB gzipped (Next.js + React runtime)

### Key Chunks

| Chunk | Gzip | Contains |
|-------|------|----------|
| 267-*.js | 15.09 kB | c15t core |
| 139-*.js | 11.57 kB | CookieBanner + Radix |
| 172-*.js | 5.79 kB | ConsentManagerDialog |

### Commands

```bash
# Automated analysis
bun run analyze:md    # Human-readable markdown
bun run analyze:json  # Machine-readable JSON

# Interactive treemap
bun run analyze       # Opens in browser
```

## Unexpected Inclusions

To verify with bundle analyzer:
- [ ] @orpc packages in client bundle?
- [ ] Backend runtime code?
- [ ] Unused translations (all 34 languages)?
- [ ] Unused Radix UI primitives?

---

## Microbenchmark Results

### Store Operations

| Operation | Avg Time | Notes |
|-----------|----------|-------|
| configureConsentManager | 24.19 ns | Very fast (cached) |
| createConsentManagerStore | 1.01 µs | ~1 microsecond |
| store.getState() | 903.47 ns | Sub-microsecond |
| resetConsents | 2.65 µs | |
| setShowPopup | 1.66 µs | |
| setIsPrivacyDialogOpen | 3.76 µs | |

### Has Condition Logic

| Operation | Avg Time | Notes |
|-----------|----------|-------|
| has() - single consent | 5.84-12.73 ns | Extremely fast |
| has() - AND (2 items) | 66.86 ns | |
| has() - AND (4 items) | 29.97 ns | |
| has() - AND (5 items) | 28.60 ns | |
| has() - OR (2 items) | 29.64 ns | |
| has() - OR (3 items) | 39.86 ns | |
| has() - OR (5 items) | 26.96 ns | |
| has() - NOT (single) | 19.16 ns | |
| has() - NOT (nested) | 32.36 ns | |
| has() - nested: AND with OR | 54.06 ns | |
| has() - nested: AND with NOT | 43.85 ns | |
| has() - nested: complex (3 levels) | 60.82 ns | |
| has() - deeply nested (4 levels) | 84.74 ns | Most complex |

### Translation Operations

| Operation | Avg Time | Notes |
|-----------|----------|-------|
| deepMergeTranslations - shallow (2 keys) | 444.84 ns | |
| deepMergeTranslations - larger (7 keys) | 545.91 ns | |
| deepMergeTranslations - full override | 553.30 ns | |
| deepMergeTranslations - empty | 383.36 ns | |
| mergeTranslationConfigs - single lang | 4.07 µs | |
| mergeTranslationConfigs - no custom | 3.17 µs | |
| detectBrowserLanguage - matching | 82.24 ns | |
| detectBrowserLanguage - auto disabled | 0.54 ns | Early return |
| prepareTranslationConfig - single lang | 3.84 µs | |
| prepareTranslationConfig - no custom | 3.29 µs | |
| prepareTranslationConfig - 4 languages | 5.25 µs | |

### Cookie Operations

| Operation | Avg Time | Notes |
|-----------|----------|-------|
| saveConsentToStorage - typical | 1.39 µs | |
| saveConsentToStorage - all true | 1.67 µs | |
| saveConsentToStorage - custom config | 1.26 µs | |
| getConsentFromStorage - after save | 515.34 ns | |
| getConsentFromStorage - custom config | 1.03 µs | |
| deleteConsentFromStorage | 479.17 ns | |
| setCookie - simple | 524.70 ns | |
| setCookie - with options | 585.11 ns | |
| getCookie - existing | 182.43 ns | |
| getCookie - non-existent | 351.67 ns | |
| deleteCookie | 193.73 ns | |
| getRootDomain | 79.73 ns | |
| Full round-trip (save/get/delete) | 3.06 µs | |

### Script Loader Operations

| Operation | Avg Time | Notes |
|-----------|----------|-------|
| createStore - 3 simple scripts | 9.75 µs | |
| createStore - 5 scripts (mixed) | 9.59 µs | |
| createStore - 7 scripts (complex) | 11.56 µs | |
| createStore - 15 scripts | 13.29 µs | |
| updateScripts - 3 simple | 10.16 µs | |
| updateScripts - 7 complex | 11.54 µs | |
| updateScripts - 15 scripts | 19.86 µs | |
---

## Key Observations

1. **`has()` is extremely fast** - Even complex nested conditions complete in under 100ns
2. **Store creation is fast** - ~1µs for basic store, ~10-15µs with scripts configured
3. **Cookie operations are sub-microsecond** - Full save/get cycle under 3µs
4. **Translation merging is the slowest** - 3-5µs for config preparation (but only runs once on init)

## Running Benchmarks

```bash
# All microbenchmarks
cd benchmarks && bun run bench

# Individual benchmarks
bun run bench:store
bun run bench:has
bun run bench:translations
bun run bench:cookie
bun run bench:script-loader

# Bundle analysis (automated)
cd benchmarks/bundle-test-app
bun run build && bun run analyze:md    # Markdown report
bun run build && bun run analyze:json  # JSON for CI

# Bundle analysis (interactive)
bun run analyze  # Opens treemap in browser
```
