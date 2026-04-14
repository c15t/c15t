---
'@c15t/ui': patch
---

Derive `textOnPrimary` automatically from the active `primary` theme color when it is omitted, so primary-filled surfaces such as stock branding tags keep a readable foreground by default.

- add a shared contrast helper in the UI theme utilities and use it as the fallback for `textOnPrimary`
- preserve explicit `textOnPrimary` overrides for consumers who need a fixed branded foreground
