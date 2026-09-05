---
"@c15t/ui": patch
---

Keep generic accordion and consent widget defaults independent of stylesheet import order. Preserve inherited `--accordion-*` overrides and resolve scoped theme tokens on the rendered element, including nested focus ring overrides.

Accordion defaults are no longer declared on the document root. Inspect the rendered element's computed styles to read its default appearance.
