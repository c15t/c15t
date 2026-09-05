---
'@c15t/core': patch
---

Notify scripts with `persistAfterConsentRevoked` when consent is revoked, so
integrations such as Meta Pixel can disable tracking while their SDK stays loaded.
Keep `alwaysLoad` integrations informed of consent changes across categories, and
report their actual consent instead of treating permission to load as consent.
