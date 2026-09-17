---
"@c15t/ui": patch
---

Fix two `var()` references that named tokens which do not exist, so the rules that carried them were silently doing nothing. `--iab-cd-shadow` asked for `--c15t-shadow-xl` above the top of a scale that ends at `lg`, which left the IAB consent dialog flat against the page while its non-IAB sibling carried a shadow; it now uses `--c15t-shadow-sm`, the same elevation the plain dialog raises its card with, so the two surfaces match and a host that overrides the shadow scale moves both. The accordion trigger label asked for `--c15t-font-weight-regular` beside a real `--c15t-font-weight-normal`, so it ignored `theme.typography.fontWeight.normal` and inherited whatever the app body happened to set; it now honours the token. Under the default theme neither change moves a pixel, since the inherited weight was already `400`. A stylesheet test now rejects any fallbackless `var(--c15t-*)` that the built sheets do not declare, which is what let both ship.
