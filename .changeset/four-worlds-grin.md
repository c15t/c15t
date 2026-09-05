---
'@c15t/core': patch
---

Reduce consent save cost with byte-equivalent subject ID encoding, and allocate listener and privacy bookkeeping only when first used.

Avoid allocating a replacement snapshot when patch inputs and their evaluation interval are unchanged.

Skip repeated freezing of immutable kernel defaults and omit private declarations that no public type entry references from the core package.
