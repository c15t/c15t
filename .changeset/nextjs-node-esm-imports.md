---
"@c15t/nextjs": patch
---

Import `next/script`, `next/server`, and `next/headers` with their `.js` extension. Next ships no `exports` map, so the bare specifiers only resolve through a bundler; the Pages Router loads this package with Node at runtime and failed with `ERR_MODULE_NOT_FOUND` now that the package is ESM-only.
