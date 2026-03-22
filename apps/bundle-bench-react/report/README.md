# React primitive bundle comparison

This benchmark compares a Radix-based entry against the c15t-owned React primitives using the same representative primitive set: button, switch, accordion, and dialog.

Current result:
c15t is smaller than the Radix baseline by 33,516 minified bytes and 11,875 gzip bytes.

Methodology:
- Both entries are bundled with `Bun.build` in browser mode with minification enabled.
- The report measures the generated JavaScript bundle, not emitted CSS assets.
- The Radix baseline uses real Radix dialog, switch, accordion, and slot primitives.
- The c15t entry uses tree-shakeable `@c15t/react/primitives/*` subpath imports.

Regenerate:
Run `bun run bundle-bench` inside `apps/bundle-bench-react` to rebuild both entries and rewrite this report.

```json
{
  "baseline": {
    "entry": "radix-baseline",
    "gzipBytes": 27613,
    "minifiedBytes": 89726
  },
  "c15t": {
    "entry": "c15t-primitives",
    "gzipBytes": 15738,
    "minifiedBytes": 56210
  },
  "deltaBytes": -33516,
  "deltaGzipBytes": -11875
}
```
