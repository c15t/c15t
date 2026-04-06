# Consent surface bundle comparison: current vs `2.0.0`

This benchmark compares the current shipped React consent surfaces against the historical `origin/2.0.0` consent surfaces.

Current result:
The current surfaces are smaller than the `2.0.0` baseline by 50,594 total bytes and 12,987 total gzip bytes.

Methodology:
- Both entries are bundled with `Bun.build` in browser mode with minification enabled.
- The current entry renders the public `ConsentBanner` and `ConsentDialog` components from the current branch.
- The baseline entry is built from a real `git worktree` checked out at `origin/2.0.0`.
- The report measures emitted JavaScript and CSS assets separately and as a combined total.
- This is a historical product-surface comparison, not an isolated primitive-only benchmark.
- The `2.0.0` baseline emits no standalone CSS asset in this build path; its styling cost is carried in JavaScript.

Regenerate:
Run `bun run bundle-bench` inside `apps/bundle-bench-react` to rebuild the current entry, create or reuse the `origin/2.0.0` worktree baseline, and rewrite this report.

```json
{
  "baseline": {
    "entry": "2.0.0-consent-surfaces",
    "cssBytes": 0,
    "cssGzipBytes": 0,
    "jsBytes": 1036730,
    "jsGzipBytes": 295395,
    "totalBytes": 1036730,
    "totalGzipBytes": 295395
  },
  "current": {
    "entry": "current-consent-surfaces",
    "cssBytes": 17878,
    "cssGzipBytes": 2591,
    "jsBytes": 968258,
    "jsGzipBytes": 279817,
    "totalBytes": 986136,
    "totalGzipBytes": 282408
  },
  "deltaCssBytes": 17878,
  "deltaCssGzipBytes": 2591,
  "deltaJsBytes": -68472,
  "deltaJsGzipBytes": -15578,
  "deltaTotalBytes": -50594,
  "deltaTotalGzipBytes": -12987
}
```
