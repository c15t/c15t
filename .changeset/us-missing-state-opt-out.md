---
'@c15t/schema': minor
'@c15t/core': minor
'c15t': minor
---

Use US opt-out with GPC and persistent preferences when the recommended policy pack knows the visitor's country is US but has no state. Keep unknown countries and missing Canadian provinces on strict opt-in, and preserve known-state behavior.

Add `match.regionFallbacks` and `policyMatchers.regionFallback()` for country-specific missing-region fallbacks. Explicit country rules take precedence; these fallbacks never match a supplied region.
