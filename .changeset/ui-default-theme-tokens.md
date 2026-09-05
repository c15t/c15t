---
'@c15t/ui': patch
---

Ship the default theme tokens in the published stylesheets. `styles.css`, `styles.tw3.css` and the IAB entrypoints now start with the `defaultTheme` tokens (`--c15t-surface`, `--c15t-radius-lg`, `--c15t-font-family`, ...) generated from the same `defaultTheme` the runtime exports, so an app that imports the stylesheet without passing a `theme` gets the default look instead of an unstyled banner — serif fallback font, square corners, transparent buttons. This matters most for server-rendered, zero-JS pages, which can never inject tokens client-side. A provider that does pass a `theme` still overrides them.
