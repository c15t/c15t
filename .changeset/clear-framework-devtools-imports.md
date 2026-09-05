---
'@c15t/cli': patch
---

Generate DevTools adapters from current framework entry points with
development-only lazy imports. Preserve server-prefetched config in the
provider and avoid installing the standalone engine for framework adapters.
Generate theme presets with separate theme tokens and component overrides
that match the v3 provider's public types.
