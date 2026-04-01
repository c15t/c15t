---
"@c15t/cli": patch
"@c15t/nextjs": patch
"@c15t/react": patch
"@c15t/ui": patch
---

feat(styles): ship explicit stylesheet entrypoints for prebuilt UI

- Publish explicit `styles.css` and `iab/styles.css` entrypoints for prebuilt UI in `@c15t/ui`, `@c15t/react`, and `@c15t/nextjs`
- Update docs and CLI setup so stylesheet imports and Tailwind host-app configuration are explicit
- Support the documented Tailwind 3 and Tailwind 4 layering model without requiring `!important`
- Add automated first-paint CDP benchmark (`benchmarks/vite-react-repro/scripts/run-first-paint-bench.ts`)

**Bundle impact (vite-react-repro):**
- JS: 435.5 KB → 361.0 KB (-74.5 KB raw, -13.4 KB gzip / -11%)
- CSS: 0.8 KB → 49.2 KB (moved from JS to CSS — net gzip saving: -6.5 KB / -5%)
- `createElement("style")` runtime calls: eliminated
- JS heap: -143 KB (-8%)

**Main-thread impact (6x CPU throttle, 3 runs × 60 samples):**
- JS evaluation: 64.5 ms → 53.1 ms (-11.4 ms / -17.7%)
- Total → first paint: 87.8 ms → 76.5 ms (-11.3 ms / -12.9%)
