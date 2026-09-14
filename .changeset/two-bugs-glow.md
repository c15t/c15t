---
"@c15t/core": patch
"@c15t/backend": patch
"@c15t/cli": patch
"@c15t/tanstack-start": patch
"@c15t/ui": patch
---

Block non-HTTP(S) URLs when restoring consent-gated iframes. Replace URL and color parsing regexes that can stall on long inputs, and detect Next.js layouts through both nested route segments.
